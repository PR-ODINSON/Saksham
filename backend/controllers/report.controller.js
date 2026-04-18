/**
 * Report controller — PS-03
 * POST /api/reports  → creates a SchoolConditionRecord + runs ML prediction
 * GET  /api/reports/:school_id → returns records for one school
 */
import { SchoolConditionRecord, MaintenanceDecision, School } from '../models/index.js';
import { predictRiskForCategory } from '../services/predictionEngine.js';
import { getIO } from '../socket/index.js';
import { writeAuditLog } from '../utils/auditLogger.js';

const VALID_CATEGORIES = ['plumbing', 'electrical', 'structural'];
const VALID_CONDITIONS = [1, 2, 3, 4, 5]; // conditionScore 1–5

/** Safe boolean parse — handles both JSON (boolean) and FormData (string) */
const parseBool = (val) => val === true || val === 'true' || val === '1' || val === 1;

// POST /api/reports
export const submitReport = async (req, res) => {
  try {
    const {
      schoolId, district, block, schoolType, isGirlsSchool, numStudents,
      buildingAge, materialType, weatherZone,
      category, weekNumber, conditionScore,
      issueFlag, waterLeak, wiringExposed, crackWidthMM,
      toiletFunctionalRatio, powerOutageHours, roofLeakFlag,
      brokenTap, cloggedDrain, tankOverflow, lowWaterPressure,
      wallSeepage, brokenDoor, brokenWindow, pestInfestation,
    } = req.body;

    // Structured input validation — no free text
    if (!schoolId || !category || !weekNumber || !conditionScore) {
      return res.status(400).json({
        success: false,
        message: 'Required: schoolId, category, weekNumber, conditionScore',
      });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }
    if (!VALID_CONDITIONS.includes(Number(conditionScore))) {
      return res.status(400).json({ success: false, message: 'conditionScore must be 1–5' });
    }

    // Image URLs from multer — store relative path so /uploads static can serve them
    const imageUrls = req.files?.length
      ? req.files.map(f => `/uploads/${f.filename}`)
      : req.file
      ? [`/uploads/${req.file.filename}`]
      : [];

    const hasPhoto      = imageUrls.length > 0;
    const photoUploaded = hasPhoto || parseBool(req.body.photoUploaded);

    // Peons must attach a photo — enforce server-side
    if (req.user?.role === 'peon' && !hasPhoto) {
      return res.status(400).json({
        success: false,
        message: 'Photo is required for peon submissions. Please attach an on-site photo.',
      });
    }

    // Build update — only overwrite images when new ones were uploaded
    const updatePayload = {
      schoolId: Number(schoolId), district, block, schoolType,
      isGirlsSchool: parseBool(isGirlsSchool),
      numStudents: Number(numStudents) || 0,
      buildingAge:  Number(buildingAge)  || 0,
      materialType, weatherZone, category,
      weekNumber: Number(weekNumber),
      conditionScore: Number(conditionScore),
      issueFlag: parseBool(issueFlag),
      waterLeak: parseBool(waterLeak),
      wiringExposed: parseBool(wiringExposed),
      crackWidthMM: Number(crackWidthMM) || 0,
      toiletFunctionalRatio: Number(toiletFunctionalRatio) || 0,
      powerOutageHours: Number(powerOutageHours) || 0,
      roofLeakFlag: parseBool(roofLeakFlag),
      brokenTap: parseBool(brokenTap),
      cloggedDrain: parseBool(cloggedDrain),
      tankOverflow: parseBool(tankOverflow),
      lowWaterPressure: parseBool(lowWaterPressure),
      wallSeepage: parseBool(wallSeepage),
      brokenDoor: parseBool(brokenDoor),
      brokenWindow: parseBool(brokenWindow),
      pestInfestation: parseBool(pestInfestation),
      photoUploaded,
      ...(imageUrls.length ? { images: imageUrls } : {}),
    };

    const record = await SchoolConditionRecord.findOneAndUpdate(
      { schoolId: Number(schoolId), category, weekNumber: Number(weekNumber) },
      updatePayload,
      { upsert: true, new: true, runValidators: true },
    );

    // ── Run ML prediction engine after save ────────────────────────────────
    // Fetch full week history for this school + category (needed for slope / trend)
    const weekHistoryDocs = await SchoolConditionRecord.find({
      schoolId: Number(schoolId),
      category,
    }).sort({ weekNumber: 1 }).lean();

    const weekHistory = weekHistoryDocs.map(r => ({
      conditionScore: r.conditionScore,
      weekNumber: r.weekNumber,
    }));

    // toiletFunctionalRatio needs null (not 0) when absent so the engine skips
    // the sanitation-threshold check (ratio < 0.7)
    const toiletRatioVal =
      toiletFunctionalRatio !== undefined && toiletFunctionalRatio !== ''
        ? Number(toiletFunctionalRatio)
        : null;

    const prediction = await predictRiskForCategory({
      weekHistory,
      buildingAge:   Number(buildingAge)  || 20,
      weatherZone:   weatherZone           || 'Dry',
      category,
      isGirlsSchool: parseBool(isGirlsSchool),
      numStudents:   Number(numStudents)   || 0,
      flags: {
        waterLeak:             parseBool(waterLeak),
        wiringExposed:         parseBool(wiringExposed),
        roofLeakFlag:          parseBool(roofLeakFlag),
        issueFlag:             parseBool(issueFlag),
        crackWidthMM:          Number(crackWidthMM)   || 0,
        toiletFunctionalRatio: toiletRatioVal,
        powerOutageHours:      Number(powerOutageHours) || 0,
        // New flags included for better logging in prediction engine context
        brokenTap: parseBool(brokenTap),
        cloggedDrain: parseBool(cloggedDrain),
        tankOverflow: parseBool(tankOverflow),
        lowWaterPressure: parseBool(lowWaterPressure),
        wallSeepage: parseBool(wallSeepage),
        brokenDoor: parseBool(brokenDoor),
        brokenWindow: parseBool(brokenWindow),
        pestInfestation: parseBool(pestInfestation),
      },
    });

    // Persist prediction results back to the record
    const updatedRecord = await SchoolConditionRecord.findByIdAndUpdate(
      record._id,
      {
        priorityScore:       prediction.riskScore,
        daysToFailure:       prediction.estimated_days_to_failure,
        willFailWithin30Days: prediction.within_30_days,
        willFailWithin60Days: prediction.within_60_days,
      },
      { new: true },
    );

    // ── Socket.IO emit + audit log ────────────────────────────────────────
    const school = await School.findOne({ schoolId: Number(schoolId) }).lean();
    const schoolName = school?.name || `School ${schoolId}`;
    const io = getIO();
    if (io) {
      io.to(`school:${schoolId}`).emit('report:submitted', { report: updatedRecord, schoolId, schoolName });
      io.to('admin').emit('report:submitted', { report: updatedRecord, schoolId, schoolName });
    }
    writeAuditLog(req, 'report_submitted', 'SchoolConditionRecord', updatedRecord._id, {
      schoolId: Number(schoolId),
      category,
      conditionScore: Number(conditionScore),
    });

    res.status(201).json({
      success: true,
      record: updatedRecord,
      prediction: {
        riskScore:                 prediction.riskScore,
        riskLevel:                 prediction.riskLevel,
        estimated_days_to_failure: prediction.estimated_days_to_failure,
        within_30_days:            prediction.within_30_days,
        within_60_days:            prediction.within_60_days,
        deterioration_rate:        prediction.deterioration_rate,
        evidence:                  prediction.evidence,
        reason:                    prediction.reason,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/reports/weekly
 * Bundled weekly submission — peon (or principal) submits ALL three categories
 * (plumbing, electrical, structural) + one photo per category in a SINGLE call.
 * Stored as 3 SchoolConditionRecord docs (one per category) sharing the same
 * { schoolId, weekNumber } so the PDF generator groups them as one report.
 *
 * Multipart fields expected (via upload.fields):
 *   - image_plumbing   (file, required for peon)
 *   - image_electrical (file, required for peon)
 *   - image_structural (file, required for peon)
 *   - schoolId, weekNumber, district, block, schoolType, isGirlsSchool,
 *     numStudents, buildingAge, materialType, weatherZone
 *   - categories  (JSON-stringified array of per-category payloads)
 */
export const submitWeeklyReport = async (req, res) => {
  try {
    const {
      schoolId, district, block, schoolType, isGirlsSchool, numStudents,
      buildingAge, materialType, weatherZone, weekNumber,
    } = req.body;

    let categories = req.body.categories;
    if (typeof categories === 'string') {
      try { categories = JSON.parse(categories); }
      catch (_) {
        return res.status(400).json({ success: false, message: 'categories must be valid JSON' });
      }
    }
    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ success: false, message: 'categories array is required' });
    }
    if (!schoolId || !weekNumber) {
      return res.status(400).json({ success: false, message: 'schoolId and weekNumber are required' });
    }

    // Build a per-category image map from req.files (upload.fields layout)
    // req.files is an object: { image_plumbing: [file], image_electrical: [file], ... }
    const filesByCat = {};
    for (const cat of VALID_CATEGORIES) {
      const arr = req.files?.[`image_${cat}`];
      if (arr && arr[0]) filesByCat[cat] = arr[0];
    }

    // For peon role, every submitted category MUST have an image attached.
    if (req.user?.role === 'peon') {
      const missing = categories
        .filter(c => !filesByCat[c.category])
        .map(c => c.category);
      if (missing.length) {
        return res.status(400).json({
          success: false,
          message: `Photo is mandatory for peon submissions. Missing photo for: ${missing.join(', ')}`,
        });
      }
    }

    // Common (school-level) metadata applied to every per-category record
    const baseMeta = {
      schoolId: Number(schoolId),
      district, block, schoolType,
      isGirlsSchool: parseBool(isGirlsSchool),
      numStudents: Number(numStudents) || 0,
      buildingAge: Number(buildingAge) || 0,
      materialType, weatherZone,
      weekNumber: Number(weekNumber),
    };

    const categoryResults = [];

    for (const c of categories) {
      const cat = c.category;
      if (!VALID_CATEGORIES.includes(cat)) {
        categoryResults.push({ category: cat, success: false, message: `Invalid category: ${cat}` });
        continue;
      }
      if (!VALID_CONDITIONS.includes(Number(c.conditionScore))) {
        categoryResults.push({ category: cat, success: false, message: 'conditionScore must be 1–5' });
        continue;
      }

      const imgFile = filesByCat[cat];
      const imageUrls = imgFile ? [`/uploads/${imgFile.filename}`] : [];

      const updatePayload = {
        ...baseMeta,
        category: cat,
        conditionScore: Number(c.conditionScore),
        issueFlag:        parseBool(c.issueFlag),
        waterLeak:        parseBool(c.waterLeak),
        wiringExposed:    parseBool(c.wiringExposed),
        crackWidthMM:     Number(c.crackWidthMM) || 0,
        toiletFunctionalRatio: Number(c.toiletFunctionalRatio) || 0,
        powerOutageHours: Number(c.powerOutageHours) || 0,
        roofLeakFlag:     parseBool(c.roofLeakFlag),
        brokenTap:        parseBool(c.brokenTap),
        cloggedDrain:     parseBool(c.cloggedDrain),
        tankOverflow:     parseBool(c.tankOverflow),
        lowWaterPressure: parseBool(c.lowWaterPressure),
        wallSeepage:      parseBool(c.wallSeepage),
        brokenDoor:       parseBool(c.brokenDoor),
        brokenWindow:     parseBool(c.brokenWindow),
        pestInfestation:  parseBool(c.pestInfestation),
        photoUploaded:    imageUrls.length > 0,
        ...(imageUrls.length ? { images: imageUrls } : {}),
      };

      const record = await SchoolConditionRecord.findOneAndUpdate(
        { schoolId: Number(schoolId), category: cat, weekNumber: Number(weekNumber) },
        updatePayload,
        { upsert: true, new: true, runValidators: true },
      );

      // Run ML prediction for this category
      const weekHistoryDocs = await SchoolConditionRecord.find({
        schoolId: Number(schoolId),
        category: cat,
      }).sort({ weekNumber: 1 }).lean();

      const weekHistory = weekHistoryDocs.map(r => ({
        conditionScore: r.conditionScore,
        weekNumber: r.weekNumber,
      }));

      const toiletRatioVal =
        c.toiletFunctionalRatio !== undefined && c.toiletFunctionalRatio !== ''
          ? Number(c.toiletFunctionalRatio)
          : null;

      const prediction = await predictRiskForCategory({
        weekHistory,
        buildingAge:   Number(buildingAge) || 20,
        weatherZone:   weatherZone || 'Dry',
        category:      cat,
        isGirlsSchool: parseBool(isGirlsSchool),
        numStudents:   Number(numStudents) || 0,
        flags: {
          waterLeak:             parseBool(c.waterLeak),
          wiringExposed:         parseBool(c.wiringExposed),
          roofLeakFlag:          parseBool(c.roofLeakFlag),
          issueFlag:             parseBool(c.issueFlag),
          crackWidthMM:          Number(c.crackWidthMM) || 0,
          toiletFunctionalRatio: toiletRatioVal,
          powerOutageHours:      Number(c.powerOutageHours) || 0,
          brokenTap: parseBool(c.brokenTap),
          cloggedDrain: parseBool(c.cloggedDrain),
          tankOverflow: parseBool(c.tankOverflow),
          lowWaterPressure: parseBool(c.lowWaterPressure),
          wallSeepage: parseBool(c.wallSeepage),
          brokenDoor: parseBool(c.brokenDoor),
          brokenWindow: parseBool(c.brokenWindow),
          pestInfestation: parseBool(c.pestInfestation),
        },
      });

      const updatedRecord = await SchoolConditionRecord.findByIdAndUpdate(
        record._id,
        {
          priorityScore:        prediction.riskScore,
          daysToFailure:        prediction.estimated_days_to_failure,
          willFailWithin30Days: prediction.within_30_days,
          willFailWithin60Days: prediction.within_60_days,
        },
        { new: true },
      );

      categoryResults.push({
        category: cat,
        success:  true,
        message:  'Recorded',
        record:   updatedRecord,
        prediction: {
          riskScore:                 prediction.riskScore,
          riskLevel:                 prediction.riskLevel,
          estimated_days_to_failure: prediction.estimated_days_to_failure,
          within_30_days:            prediction.within_30_days,
          within_60_days:            prediction.within_60_days,
          deterioration_rate:        prediction.deterioration_rate,
          evidence:                  prediction.evidence,
          reason:                    prediction.reason,
        },
      });
    }

    // Single socket emit per submission (covers all 3 categories)
    const school = await School.findOne({ schoolId: Number(schoolId) }).lean();
    const schoolName = school?.name || `School ${schoolId}`;
    const io = getIO();
    if (io) {
      io.to(`school:${schoolId}`).emit('report:submitted', {
        schoolId, schoolName, weekNumber: Number(weekNumber),
        categories: categoryResults.map(r => r.category),
      });
      io.to('admin').emit('report:submitted', {
        schoolId, schoolName, weekNumber: Number(weekNumber),
        categories: categoryResults.map(r => r.category),
      });
    }

    writeAuditLog(req, 'weekly_report_submitted', 'SchoolConditionRecord', null, {
      schoolId: Number(schoolId),
      weekNumber: Number(weekNumber),
      categories: categoryResults.map(r => r.category),
    });

    res.status(201).json({
      success: categoryResults.every(r => r.success),
      schoolId: Number(schoolId),
      weekNumber: Number(weekNumber),
      results: categoryResults,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/reports/:school_id
export const getReportsBySchool = async (req, res) => {
  try {
    const schoolId = Number(req.params.school_id);
    if (isNaN(schoolId)) {
      return res.status(400).json({ success: false, message: 'school_id must be a number' });
    }

    const records = await SchoolConditionRecord.find({ schoolId })
      .sort({ weekNumber: -1, category: 1 })
      .lean();

    res.json({ success: true, records, total: records.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reports  (list, with optional filters)
export const getReports = async (req, res) => {
  try {
    const { schoolId, district, category, weekNumber, limit = 50 } = req.query;
    const filter = {};
    if (schoolId)   filter.schoolId   = Number(schoolId);
    if (district)   filter.district   = district;
    if (category)   filter.category   = category;
    if (weekNumber) filter.weekNumber = Number(weekNumber);

    const records = await SchoolConditionRecord.find(filter)
      .sort({ weekNumber: -1 })
      .limit(Number(limit))
      .lean();

    res.json({ success: true, records, total: records.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/reports/:id/review
export const reviewReport = async (req, res) => {
  try {
    const { note } = req.body;
    const doc = await SchoolConditionRecord.findByIdAndUpdate(
      req.params.id,
      {
        reviewNote:   note,
        reviewedBy:   req.user?._id || req.user?.id,
        reviewedAt:   new Date(),
      },
      { new: true },
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Record not found' });

    const io = getIO();
    if (io) {
      io.to(`school:${doc.schoolId}`).emit('report:reviewed', {
        reportId:    doc._id,
        schoolId:    doc.schoolId,
        principalNote: note,
      });
    }
    writeAuditLog(req, 'report_reviewed', 'SchoolConditionRecord', doc._id, { note });

    res.json({ success: true, record: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/reports/:id/forward
export const forwardReport = async (req, res) => {
  try {
    const doc = await SchoolConditionRecord.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Record not found' });

    // Get district via school lookup
    const school = await School.findOne({ schoolId: doc.schoolId }).lean();
    const district = school?.district || doc.district;

    doc.forwardedAt = new Date();
    doc.forwardedBy = req.user?._id || req.user?.id;
    await doc.save();

    // Trigger maintenance decision creation
    await scoreAndCreateMaintenanceDecision(doc, school);

    const io = getIO();
    if (io) {
      io.to(`deo:${district}`).emit('report:forwarded', { reportId: doc._id, schoolId: doc.schoolId, district });
      io.to('admin').emit('report:forwarded', { reportId: doc._id, schoolId: doc.schoolId, district });
    }
    writeAuditLog(req, 'report_forwarded', 'SchoolConditionRecord', doc._id, { district });

    res.json({ success: true, message: 'Forwarded', reportId: doc._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

async function scoreAndCreateMaintenanceDecision(record, school) {
  try {
    const priorityScore = record.priorityScore || 0;
    const priorityLevel =
      priorityScore >= 75 ? 'high' :
      priorityScore >= 50 ? 'medium' :
      priorityScore >= 25 ? 'low' : 'low';

    const decision = await MaintenanceDecision.findOneAndUpdate(
      { schoolId: record.schoolId, category: record.category, weekNumber: record.weekNumber },
      {
        recordId:  record._id,
        schoolId:  record.schoolId,
        district:  record.district || school?.district || '',
        category:  record.category,
        weekNumber: record.weekNumber,
        decision: {
          computedPriorityScore: priorityScore,
          priorityLevel,
        },
        impact: {
          studentsAffected: record.numStudents || 0,
          isGirlsSchool:    record.isGirlsSchool || false,
          criticalFacility: record.isGirlsSchool || false,
        },
        explainability: { reasons: [] },
        status: 'pending',
      },
      { upsert: true, new: true },
    );

    // Emit maintenance:created to deo room
    const io = getIO();
    if (io && decision) {
      const dist = record.district || school?.district || '';
      io.to(`deo:${dist}`).emit('maintenance:created', { request: decision, district: dist });
      io.to('admin').emit('maintenance:created', { request: decision, district: dist });
    }

    return decision;
  } catch (err) {
    console.error('[scoreAndCreateMaintenanceDecision]', err.message);
  }
}
export const getReportsStats = async (req, res) => {
  try {
    const schoolId = Number(req.query.schoolId);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: "schoolId is required" });
    }

    // Get unique week numbers that have reports
    const reportWeeks = await SchoolConditionRecord.distinct("weekNumber", { schoolId });

    // Build stats for 52 weeks
    const stats = [];
    for (let i = 1; i <= 52; i++) {
      stats.push({
        week: i,
        submitted: reportWeeks.includes(i),
      });
    }

    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
