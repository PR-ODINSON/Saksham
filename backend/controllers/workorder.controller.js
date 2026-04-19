/**
 * Work Order controller — PS-03
 * Uses the new WorkOrder schema: decisionId, schoolId (Number), deadline, status.
 */
import mongoose from 'mongoose';
import { WorkOrder, MaintenanceDecision, RepairLog, SchoolConditionRecord, School, Alert } from '../models/index.js';
import fs from 'fs';
import path from 'path';
import cloudinary from '../config/cloudinary.js';
import { getIO } from '../socket/index.js';
import { writeAuditLog } from '../utils/auditLogger.js';

/**
 * Haversine formula to calculate distance between two points in km.
 */
function getDistanceKM(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// GET /api/tasks  |  GET /api/work-orders
export const getWorkOrders = async (req, res) => {
  try {
    const { status, schoolId, district, locationMismatch } = req.query;
    const filter = {};
    if (status)   filter.status   = status;
    if (schoolId) filter.schoolId = Number(schoolId);
    if (district) filter.district = district;
    if (locationMismatch) filter.locationMismatch = locationMismatch === 'true';

    // Contractors see only their own work
    if (req.user?.role === 'contractor') {
      filter['assignment.assignedTo'] = new mongoose.Types.ObjectId(req.user.id);
    }

    let orders;
    if (locationMismatch === 'true') {
      // Use aggregation to fetch school coordinates for comparison
      orders = await WorkOrder.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'schools',
            localField: 'schoolId',
            foreignField: 'schoolId',
            as: 'school'
          }
        },
        { $unwind: { path: '$school', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'assignment.assignedTo',
            foreignField: '_id',
            as: 'contractor'
          }
        },
        { $unwind: { path: '$contractor', preserveNullAndEmptyArrays: true } },
        { $sort: { createdAt: -1 } }
      ]);
    } else {
      orders = await WorkOrder.find(filter)
        .sort({ createdAt: -1 })
        .populate('assignment.assignedTo', 'name phone')
        .populate('assignment.assignedBy', 'name')
        .lean();
    }

    res.json({ success: true, workOrders: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/tasks/assign  |  POST /api/work-orders/assign
export const assignTask = async (req, res) => {
  try {
    const { decisionId, schoolId, district, category, assignedTo, priorityScore, deadline, weekNumber } = req.body;

    if (!schoolId || !category || !deadline) {
      return res.status(400).json({
        success: false,
        message: 'Required: schoolId, category, deadline',
      });
    }

    // Resolve decisionId if not provided — prefer the decision belonging to
    // the explicit weekNumber the DEO is assigning from. Fall back to the
    // latest pending decision for school+category if weekNumber is omitted.
    let resolvedDecisionId = decisionId;
    if (!resolvedDecisionId) {
      const lookup = { schoolId: Number(schoolId), category };
      if (weekNumber !== undefined && weekNumber !== null && weekNumber !== '') {
        lookup.weekNumber = Number(weekNumber);
      } else {
        lookup.status = 'pending';
      }
      const decision = await MaintenanceDecision.findOne(lookup)
        .sort({ 'decision.computedPriorityScore': -1 });
      if (decision) {
        resolvedDecisionId = decision._id;
        if (decision.status !== 'completed') {
          decision.status = 'assigned';
          await decision.save();
        }
      }
    }

    const task = await WorkOrder.create({
      decisionId:    resolvedDecisionId || undefined,
      schoolId:      Number(schoolId),
      district:      district || '',
      category,
      assignment: {
        assignedTo: assignedTo || undefined,
        assignedBy: req.user?.id || undefined,
      },
      priorityScore: Number(priorityScore) || 0,
      status:   'assigned',
      deadline: new Date(deadline),
    });

    // ── Socket.IO emit + audit log ────────────────────────────────────────
    const resolvedDistrict = district || '';
    const io = getIO();
    if (io) {
      if (assignedTo) {
        io.to(`contractor:${assignedTo}`).emit('task:assigned', { task, contractorId: assignedTo, district: resolvedDistrict });
      }
      if (resolvedDistrict) {
        io.to(`deo:${resolvedDistrict}`).emit('task:assigned', { task, district: resolvedDistrict });
      }
      io.to('admin').emit('task:assigned', { task });
    }
    writeAuditLog(req, 'task_assigned', 'WorkOrder', task._id, {
      schoolId: Number(schoolId),
      category,
      contractorId: assignedTo,
    });

    res.status(201).json({ success: true, workOrder: task });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/tasks/complete  |  POST /api/work-orders/complete
// PS-03 learning rule: create a RepairLog recording before/after state
export const completeTask = async (req, res) => {
  try {
    const { 
      workOrderId, afterConditionScore, beforeConditionScore, notes, lat, lng,
      repair_done, contractor_delay_days, sla_breach 
    } = req.body;
    let { photoUrl } = req.body;

    const workOrder = await WorkOrder.findById(workOrderId);
    if (!workOrder) {
      return res.status(404).json({ success: false, message: 'Work order not found' });
    }

    const isContractor = req.user?.role === 'contractor' &&
      workOrder.assignment?.assignedTo?.toString() === req.user.id;
    const isAuthorised = isContractor || ['deo', 'admin'].includes(req.user?.role);
    if (!isAuthorised) {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }

    // 0. Cloudinary Upload for completion image
    if (req.file) {
      try {
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'saksham/completion_proofs' },
            (err, res) => err ? reject(err) : resolve(res)
          );
          stream.end(req.file.buffer);
        });
        photoUrl = result.secure_url;
      } catch (uploadErr) {
        console.warn('Cloudinary completion upload failed:', uploadErr.message);
      }
    }

    // 1. GPS Validation
    //
    // We only run a real distance check when the school's lat/lng has been
    // explicitly verified (`location.verified === true`). The seed script
    // assigns synthetic district-centroid + random jitter coordinates to every
    // school, so running the check unconditionally produces false positives
    // for almost every legitimate completion. Threshold is configurable via
    // GPS_MISMATCH_THRESHOLD_KM env (default 5 km).
    const THRESHOLD_KM = Number(process.env.GPS_MISMATCH_THRESHOLD_KM) || 5;
    let locationMismatch = false;
    let school = null;
    if (lat && lng) {
      school = await School.findOne({ schoolId: workOrder.schoolId });
      if (
        school &&
        school.location &&
        school.location.verified === true &&
        Number.isFinite(school.location.lat) &&
        Number.isFinite(school.location.lng)
      ) {
        const distance = getDistanceKM(lat, lng, school.location.lat, school.location.lng);
        if (distance > THRESHOLD_KM) {
          locationMismatch = true;
        }
      }
      workOrder.completionProof = {
        photoUrl,
        gpsLocation: { lat, lng }
      };
    }

    const now = new Date();
    workOrder.status = 'completed';
    workOrder.completedAt = now;
    workOrder.locationMismatch = locationMismatch;
    await workOrder.save();

    // 1.5 Create GPS Mismatch Alert if detected
    if (locationMismatch) {
      if (!school) school = await School.findOne({ schoolId: workOrder.schoolId });
      await Alert.create({
        schoolId: workOrder.schoolId,
        district: school?.district || workOrder.district || 'Unknown',
        category: workOrder.category,
        type: 'GPS_MISMATCH',
        message: `GPS Mismatch: Contractor submitted completion for ${school?.name || 'School ' + workOrder.schoolId} from a distant location. Verify required.`,
      });
    }

    // 2. Data for Repair Log
    const beforeRecord = await SchoolConditionRecord.findOne({
      schoolId: workOrder.schoolId,
      category: workOrder.category,
    }).sort({ weekNumber: -1 });

    const completionTimeDays = Math.round(
      (now.getTime() - workOrder.createdAt.getTime()) / 86400000,
    );

    const slaBreached = now > workOrder.deadline;

    const repairLog = await RepairLog.create({
      workOrderId:    workOrder._id,
      schoolId:       workOrder.schoolId,
      category:       workOrder.category,
      before: {
        conditionScore: Number(beforeConditionScore) || beforeRecord?.conditionScore || 5,
        issues: {
          waterLeak:     beforeRecord?.waterLeak,
          wiringExposed:  beforeRecord?.wiringExposed,
          roofLeakFlag:   beforeRecord?.roofLeakFlag,
          notes,
        },
      },
      after: {
        conditionScore: Number(afterConditionScore) || 2,
      },
      completionTimeDays,
      contractorDelayDays: slaBreached ? Math.max(0, completionTimeDays - 30) : 0,
      slaBreached,
      locationMismatch,
      photoUrl
    });

    // 3. Update decision status
    if (workOrder.decisionId) {
      await MaintenanceDecision.findByIdAndUpdate(
        workOrder.decisionId,
        { status: 'completed' },
      );
    }

    // 4. Update TS-PS3.csv by appending a new row reflecting the fixed state
    try {
      const csvPath = path.join(process.cwd(), '..', 'TS-PS3.csv');
      const schoolDetails = await School.findOne({ schoolId: workOrder.schoolId });
      
      const newRow = [
        workOrder.schoolId,
        schoolDetails?.district || workOrder.district || 'Unknown',
        schoolDetails?.block || 'Unknown',
        schoolDetails?.schoolType || 'Primary',
        schoolDetails?.girlsSchool ? 1 : 0,
        schoolDetails?.numStudents || 500,
        schoolDetails?.buildingAge || 20,
        schoolDetails?.materialType || 'Brick',
        schoolDetails?.weatherZone || 'Dry',
        workOrder.category,
        beforeRecord?.weekNumber || new Date().getWeek ? new Date().getWeek() : 12,
        Number(afterConditionScore) || 1, // updated condition score
        0, // issue_flag
        0, // water_leak
        0, // wiring_exposed
        0, // crack_width_mm
        1.0, // toilet_functional_ratio
        0, // power_outage_hours_weekly
        0, // roof_leak_flag
        photoUrl ? 1 : 0, // photo_uploaded
        100, // days_to_failure (safe now)
        0, // failure_within_30_days
        0, // failure_within_60_days
        0, // priority_score
        repair_done !== undefined ? repair_done : 1,
        0, // days_since_repair (just repaired)
        contractor_delay_days || 0,
        sla_breach || 0
      ].join(',') + '\n';
      
      fs.appendFileSync(csvPath, newRow);
      console.log('Appended new feedback data to TS-PS3.csv');
    } catch (csvErr) {
      console.error('Failed to write to TS-PS3.csv:', csvErr);
    }

    // ── Socket.IO emit + audit log ────────────────────────────────────────
    const taskDistrict = workOrder.district;
    const io = getIO();
    if (io) {
      if (taskDistrict) {
        io.to(`deo:${taskDistrict}`).emit('task:completed', {
          taskId: workOrder._id,
          district: taskDistrict,
          schoolId: workOrder.schoolId,
        });
      }
      io.to('admin').emit('task:completed', { taskId: workOrder._id });
    }
    writeAuditLog(req, 'task_completed', 'WorkOrder', workOrder._id, {
      schoolId: workOrder.schoolId,
      locationMismatch,
      slaBreached: repairLog.slaBreached,
    });

    res.json({ success: true, workOrder, repairLog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/work-orders/:id/status
export const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const workOrder = await WorkOrder.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );
    if (!workOrder) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, workOrder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/work-orders/:id/details  |  GET /api/tasks/:id/details
// Returns the work order joined with the source SchoolConditionRecord
// (issues + LR + photos uploaded by the peon) and the School metadata.
// Contractors only see their own; DEO/admin/principal can see any.
export const getWorkOrderDetails = async (req, res) => {
  try {
    const wo = await WorkOrder.findById(req.params.id)
      .populate('assignment.assignedTo', 'name phone email')
      .populate('assignment.assignedBy', 'name role')
      .lean();

    if (!wo) return res.status(404).json({ success: false, message: 'Work order not found' });

    if (req.user?.role === 'contractor' &&
        wo.assignment?.assignedTo?._id?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }

    // Load the source condition record. If decisionId is set use it, otherwise
    // fall back to the latest record matching school + category + week.
    let conditionRecord = null;
    if (wo.decisionId) {
      const decision = await MaintenanceDecision.findById(wo.decisionId).lean();
      if (decision?.recordId) {
        conditionRecord = await SchoolConditionRecord.findById(decision.recordId).lean();
      }
    }
    if (!conditionRecord) {
      conditionRecord = await SchoolConditionRecord.findOne({
        schoolId: wo.schoolId,
        category: wo.category,
      }).sort({ weekNumber: -1 }).lean();
    }

    const school = await School.findOne({ schoolId: wo.schoolId }).lean();

    // Build a human-readable list of "what is wrong" from the record's flags.
    const issues = [];
    if (conditionRecord) {
      const r = conditionRecord;
      if (r.waterLeak)       issues.push({ key: 'waterLeak',       label: 'Active water leak',                    severity: 'high'     });
      if (r.wiringExposed)   issues.push({ key: 'wiringExposed',   label: 'Exposed live wiring',                  severity: 'critical' });
      if (r.roofLeakFlag)    issues.push({ key: 'roofLeakFlag',    label: 'Roof leakage detected',                severity: 'high'     });
      if (r.brokenTap)       issues.push({ key: 'brokenTap',       label: 'Broken tap(s)',                        severity: 'medium'   });
      if (r.cloggedDrain)    issues.push({ key: 'cloggedDrain',    label: 'Drain clogged',                        severity: 'medium'   });
      if (r.tankOverflow)    issues.push({ key: 'tankOverflow',    label: 'Water tank overflow',                  severity: 'high'     });
      if (r.lowWaterPressure)issues.push({ key: 'lowWaterPressure',label: 'Low water pressure',                   severity: 'medium'   });
      if (r.wallSeepage)     issues.push({ key: 'wallSeepage',     label: 'Wall seepage / dampness',              severity: 'high'     });
      if (r.brokenDoor)      issues.push({ key: 'brokenDoor',      label: 'Broken door',                          severity: 'low'      });
      if (r.brokenWindow)    issues.push({ key: 'brokenWindow',    label: 'Broken window',                        severity: 'medium'   });
      if (r.pestInfestation) issues.push({ key: 'pestInfestation', label: 'Pest / rodent infestation',            severity: 'high'     });
      if (r.crackWidthMM > 5)issues.push({ key: 'crack',           label: `Wall crack ${r.crackWidthMM}mm wide`,  severity: r.crackWidthMM > 10 ? 'critical' : 'high' });
      if (r.toiletFunctionalRatio !== undefined && r.toiletFunctionalRatio < 0.5)
        issues.push({ key: 'toilets', label: `Only ${Math.round((r.toiletFunctionalRatio||0)*100)}% toilets functional`, severity: 'high' });
      if (r.powerOutageHours > 8)
        issues.push({ key: 'power', label: `${r.powerOutageHours} h power outage / week`, severity: r.powerOutageHours > 16 ? 'critical' : 'high' });
    }

    res.json({
      success: true,
      workOrder: wo,
      school,
      conditionRecord,
      issues,
      photos: conditionRecord?.images || [],
      lr: conditionRecord ? {
        urgencyFactor:        conditionRecord.lrUrgencyFactor ?? null,
        urgencyLabel:         conditionRecord.lrUrgencyLabel ?? null,
        priorityScore:        conditionRecord.lrPriorityScore ?? conditionRecord.priorityScore ?? null,
        daysToFailure:        conditionRecord.lrDaysToFailure ?? conditionRecord.daysToFailure ?? null,
        fail30Probability:    conditionRecord.lrFail30Probability ?? null,
        fail60Probability:    conditionRecord.lrFail60Probability ?? null,
        willFailWithin30Days: conditionRecord.willFailWithin30Days ?? false,
        willFailWithin60Days: conditionRecord.willFailWithin60Days ?? false,
        modelVersion:         conditionRecord.lrModelVersion ?? null,
      } : null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/tasks/:id/respond  (contractor accept/reject)
export const respondToTask = async (req, res) => {
  try {
    const { decision, note, scope } = req.body;
    const taskId = req.params.id;

    if (!['accepted', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: "decision must be 'accepted' or 'rejected'" });
    }

    const task = await WorkOrder.findById(taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const isContractor = req.user?.role === 'contractor' &&
      task.assignment?.assignedTo?.toString() === req.user.id;
    const isAuthorised = isContractor || ['deo', 'admin'].includes(req.user?.role);
    if (!isAuthorised) {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }

    let updatedCount = 0;

    if (decision === 'rejected') {
      task.status = 'pending';
      task.assignment.assignedTo = undefined;
      await task.save();
      updatedCount = 1;

      writeAuditLog(req, 'task_rejected', 'WorkOrder', task._id, { note });
    } else if (decision === 'accepted' && scope === 'district') {
      // Accept all pending/assigned tasks in same district for same contractor
      const result = await WorkOrder.updateMany(
        {
          district:   task.district,
          'assignment.assignedTo': task.assignment.assignedTo,
          status: { $in: ['pending', 'assigned'] },
        },
        { $set: { status: 'accepted' } },
      );
      updatedCount = result.modifiedCount;

      // Write audit for each touched doc — simplified: one log for the batch
      writeAuditLog(req, 'task_accepted_district', 'WorkOrder', task._id, {
        scope: 'district',
        district: task.district,
        updatedCount,
        note,
      });
    } else {
      // accepted + school
      task.status = 'accepted';
      await task.save();
      updatedCount = 1;

      writeAuditLog(req, 'task_accepted', 'WorkOrder', task._id, { scope: 'school', note });
    }

    // ── Socket.IO emit ─────────────────────────────────────────────────
    const io = getIO();
    if (io) {
      const emitPayload = { taskId: task._id, decision, note, district: task.district };
      if (task.district) {
        io.to(`deo:${task.district}`).emit('contractor:decision', emitPayload);
      }
      io.to('admin').emit('contractor:decision', emitPayload);
    }

    res.json({ success: true, updated: updatedCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/tasks/:id/feedback
export const getRepairLogByTask = async (req, res) => {
  try {
    const repairLog = await RepairLog.findOne({ workOrderId: req.params.id }).lean();
    if (!repairLog) {
      return res.status(404).json({ success: false, message: 'Feedback not found for this task' });
    }
    res.json({ success: true, feedback: repairLog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
