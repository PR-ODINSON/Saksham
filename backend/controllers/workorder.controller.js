/**
 * Work Order controller — PS-03
 * Uses the new WorkOrder schema: decisionId, schoolId (Number), deadline, status.
 */
import mongoose from 'mongoose';
import { WorkOrder, MaintenanceDecision, RepairLog, SchoolConditionRecord, School, Alert } from '../models/index.js';
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
    const { decisionId, schoolId, district, category, assignedTo, priorityScore, deadline } = req.body;

    if (!schoolId || !category || !deadline) {
      return res.status(400).json({
        success: false,
        message: 'Required: schoolId, category, deadline',
      });
    }

    // Resolve decisionId if not provided — use latest pending decision for school+category
    let resolvedDecisionId = decisionId;
    if (!resolvedDecisionId) {
      const decision = await MaintenanceDecision.findOne({
        schoolId: Number(schoolId),
        category,
        status: 'pending',
      }).sort({ 'decision.computedPriorityScore': -1 });
      if (decision) {
        resolvedDecisionId = decision._id;
        // Update decision status to 'assigned'
        decision.status = 'assigned';
        await decision.save();
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
    const { workOrderId, afterConditionScore, beforeConditionScore, notes, lat, lng, photoUrl } = req.body;

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

    // 1. GPS Validation
    let locationMismatch = false;
    if (lat && lng) {
      const school = await School.findOne({ schoolId: workOrder.schoolId });
      if (school && school.location && school.location.lat) {
        const distance = getDistanceKM(lat, lng, school.location.lat, school.location.lng);
        if (distance > 5) {
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
      const school = await School.findOne({ schoolId: workOrder.schoolId });
      await Alert.create({
        schoolId: workOrder.schoolId,
        district: school?.district || workOrder.district || 'Unknown',
        category: workOrder.category,
        type: 'GPS_MISMATCH',
        message: `🚩 GPS Mismatch: Contractor submitted completion for ${school?.name || 'School ' + workOrder.schoolId} from a distant location. Verify required.`,
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
