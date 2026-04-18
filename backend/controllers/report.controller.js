/**
 * Report controller — PS-03
 * POST /api/reports  → creates a SchoolConditionRecord + runs ML prediction
 * GET  /api/reports/:school_id → returns records for one school
 */
import { SchoolConditionRecord, MaintenanceDecision, School, ReportImage } from '../models/index.js';
import cloudinary from '../config/cloudinary.js';
import { predictRiskForCategory } from '../services/predictionEngine.js';
import { predictWithLR } from '../services/lrModel.js';
import { recomputeDistrictAnalytics } from '../services/districtAnalytics.js';
import { getIO } from '../socket/index.js';
import { writeAuditLog } from '../utils/auditLogger.js';

// Fire-and-forget district analytics refresh. Errors are logged but never
// bubble up — a flaky Mongo round-trip should not fail the user's POST.
const refreshDistrict = (district) => {
  if (!district) return;
  recomputeDistrictAnalytics(district).catch(err =>
    console.warn(`[analytics] recompute failed for ${district}:`, err.message),
  );
};

const VALID_CATEGORIES = ['plumbing', 'electrical', 'structural'];
const VALID_CONDITIONS = [1, 2, 3, 4, 5]; // conditionScore 1–5

/** Safe boolean parse — handles both JSON (boolean) and FormData (string) */
const parseBool = (val) => val === true || val === 'true' || val === '1' || val === 1;

/**
 * Persist a multer in-memory file as a MongoDB document so the image is
 * available from any laptop talking to the same Atlas cluster (i.e. not
 * tied to whatever machine is hosting the backend filesystem).
 *
 * Returns `/api/images/<id>` — the same URL shape the frontend already
 * concatenates onto API_BASE.
 */
/**
 * Uploads a multer memory file to Cloudinary and returns the secure URL.
 */
async function uploadImageToCloudinary(file) {
  if (!file || !file.buffer) return null;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'saksham/reports' },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );
    uploadStream.end(file.buffer);
  });
}

/**
 * Robust helper to fetch the School profile and use its values if the submission
 * lacks district, schoolType, materialType, etc.
 */
async function augmentWithSchoolMetadata(payload, user) {
  const school = await School.findOne({ schoolId: payload.schoolId }).lean();
  
  const merged = { ...payload };

  // Helper to pick the first "real" value (not undefined, not null, not empty string)
  const pick = (val1, val2, val3) => {
    if (val1 !== undefined && val1 !== null && val1 !== "") return val1;
    if (val2 !== undefined && val2 !== null && val2 !== "") return val2;
    if (val3 !== undefined && val3 !== null && val3 !== "") return val3;
    return undefined;
  };

  merged.district      = pick(payload.district,      school?.district, user?.district);
  merged.block         = pick(payload.block,         school?.block);
  merged.schoolType    = pick(payload.schoolType,    school?.schoolType);
  merged.isGirlsSchool = payload.isGirlsSchool ?? school?.isGirlsSchool ?? false;
  merged.numStudents   = payload.numStudents   || school?.numStudents || 0;
  merged.buildingAge   = payload.buildingAge   || school?.infrastructure?.buildingAge || 0;
  merged.materialType  = pick(payload.materialType,  school?.infrastructure?.materialType);
  merged.weatherZone   = pick(payload.weatherZone,   school?.infrastructure?.weatherZone, 'Dry');

  // CLEANUP: If an enum field is STILL empty string after merging, remove it so
  // Mongoose validation doesn't block the save.
  if (merged.schoolType === "")   delete merged.schoolType;
  if (merged.materialType === "") delete merged.materialType;
  if (merged.weatherZone === "")  delete merged.weatherZone;

  return merged;
}

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

    // Image bytes from multer (memory storage) → saved as MongoDB documents.
    // The returned URLs (/api/images/<id>) work from any laptop that can
    // reach Atlas, so photos are no longer tied to the backend's local disk.
    const ctxForImages = {
      schoolId:   Number(schoolId),
      weekNumber: Number(weekNumber),
      category,
      uploadedBy: req.user?._id || req.user?.id,
    };
    const incomingFiles = req.files?.length
      ? req.files
      : req.file
      ? [req.file]
      : [];
    const imageUrls = (
      await Promise.all(incomingFiles.map(f => uploadImageToCloudinary(f)))
    ).filter(Boolean);

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

    // ── FALLBACK: Load missing metadata from School doc ─────────────────────
    const finalPayload = await augmentWithSchoolMetadata(updatePayload, req.user);

    // TESTING MODE: previously this upserted into a single (schoolId, category,
    // weekNumber) doc, so a peon could only ever have ONE submission per week
    // per category. We now `create` a fresh document on every submission so all
    // reports are kept and downstream ML / forwarding can work on them.
    const record = await SchoolConditionRecord.create(finalPayload);

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
      buildingAge:   Number(finalPayload.buildingAge)   || 20,
      weatherZone:   finalPayload.weatherZone           || 'Dry',
      category,
      isGirlsSchool: parseBool(finalPayload.isGirlsSchool),
      numStudents:   Number(finalPayload.numStudents)   || 0,
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

    // ── Machine-learning (LR) prediction — runs alongside heuristic engine ──
    const lr = predictWithLR({
      conditionScore:        Number(conditionScore),
      buildingAge:           Number(finalPayload.buildingAge) || 20,
      numStudents:           Number(finalPayload.numStudents) || 0,
      isGirlsSchool:         parseBool(finalPayload.isGirlsSchool),
      waterLeak:             parseBool(waterLeak),
      wiringExposed:         parseBool(wiringExposed),
      roofLeakFlag:          parseBool(roofLeakFlag),
      issueFlag:             parseBool(issueFlag),
      crackWidthMM:          Number(crackWidthMM)        || 0,
      toiletFunctionalRatio: toiletRatioVal ?? 1,
      powerOutageHours:      Number(powerOutageHours)    || 0,
      weatherZone:           finalPayload.weatherZone || 'Dry',
      category,
    });

    // Persist BOTH heuristic + LR results back to the record. The LR urgency
    // factor (when available) is what the DEO queue sorts on.
    const persistPayload = {
      priorityScore:        lr?.urgencyFactor ?? prediction.riskScore,
      daysToFailure:        lr?.daysToFailure ?? prediction.estimated_days_to_failure,
      willFailWithin30Days: lr?.willFailWithin30Days ?? prediction.within_30_days,
      willFailWithin60Days: lr?.willFailWithin60Days ?? prediction.within_60_days,
    };
    if (lr) {
      Object.assign(persistPayload, {
        lrPriorityScore:     lr.priorityScore,
        lrDaysToFailure:     lr.daysToFailure,
        lrFail30Probability: lr.fail30Probability,
        lrFail60Probability: lr.fail60Probability,
        lrUrgencyFactor:     lr.urgencyFactor,
        lrUrgencyLabel:      lr.urgencyLabel,
        lrModelVersion:      lr.modelVersion,
      });
    }
    const updatedRecord = await SchoolConditionRecord.findByIdAndUpdate(
      record._id, persistPayload, { new: true },
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
    refreshDistrict(finalPayload.district);

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
      lr: lr || null,
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

    // ── FALLBACK: Load missing metadata from School doc (once per bundled call) ──
    const augmentedBase = await augmentWithSchoolMetadata(baseMeta, req.user);

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
      const persistedUrl = imgFile ? await uploadImageToCloudinary(imgFile) : null;
      const imageUrls = persistedUrl ? [persistedUrl] : [];

      const updatePayload = {
        ...augmentedBase,
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

      // TESTING MODE: see note in submitReport — multiple weekly bundles per
      // (school, week) are now allowed; create a new record per category on
      // every submission instead of upserting the existing one.
      const record = await SchoolConditionRecord.create(updatePayload);

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
        buildingAge:   Number(augmentedBase.buildingAge) || 20,
        weatherZone:   augmentedBase.weatherZone         || 'Dry',
        category:      cat,
        isGirlsSchool: parseBool(augmentedBase.isGirlsSchool),
        numStudents:   Number(augmentedBase.numStudents) || 0,
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

      // ── Machine-learning (LR) prediction for this category ─────────────────
      const lr = predictWithLR({
        conditionScore:        Number(c.conditionScore),
        buildingAge:           Number(augmentedBase.buildingAge) || 20,
        numStudents:           Number(augmentedBase.numStudents) || 0,
        isGirlsSchool:         parseBool(augmentedBase.isGirlsSchool),
        waterLeak:             parseBool(c.waterLeak),
        wiringExposed:         parseBool(c.wiringExposed),
        roofLeakFlag:          parseBool(c.roofLeakFlag),
        issueFlag:             parseBool(c.issueFlag),
        crackWidthMM:          Number(c.crackWidthMM)        || 0,
        toiletFunctionalRatio: toiletRatioVal ?? 1,
        powerOutageHours:      Number(c.powerOutageHours)    || 0,
        weatherZone:           augmentedBase.weatherZone || 'Dry',
        category:              cat,
      });

      const persistPayload = {
        priorityScore:        lr?.urgencyFactor ?? prediction.riskScore,
        daysToFailure:        lr?.daysToFailure ?? prediction.estimated_days_to_failure,
        willFailWithin30Days: lr?.willFailWithin30Days ?? prediction.within_30_days,
        willFailWithin60Days: lr?.willFailWithin60Days ?? prediction.within_60_days,
      };
      if (lr) {
        Object.assign(persistPayload, {
          lrPriorityScore:     lr.priorityScore,
          lrDaysToFailure:     lr.daysToFailure,
          lrFail30Probability: lr.fail30Probability,
          lrFail60Probability: lr.fail60Probability,
          lrUrgencyFactor:     lr.urgencyFactor,
          lrUrgencyLabel:      lr.urgencyLabel,
          lrModelVersion:      lr.modelVersion,
        });
      }

      const updatedRecord = await SchoolConditionRecord.findByIdAndUpdate(
        record._id, persistPayload, { new: true },
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
        lr: lr || null,
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
    refreshDistrict(augmentedBase.district);

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

/**
 * GET /api/reports/weekly/bundles?schoolId=…&forwardedOnly=true&district=…
 * Returns weekly bundles grouped by (schoolId, weekNumber). Used by:
 *  • principal — pass schoolId, see all weeks for the school
 *  • DEO       — pass forwardedOnly=true (and optional district) to see every
 *                forwarded bundle across the district, ranked by LR urgency
 */
export const getWeeklyBundles = async (req, res) => {
  try {
    const { schoolId, district, forwardedOnly } = req.query;
    const onlyForwarded = forwardedOnly === 'true' || forwardedOnly === '1';

    const filter = {};
    if (schoolId) filter.schoolId = Number(schoolId);
    if (district) filter.district = district;
    if (onlyForwarded) filter.forwardedAt = { $ne: null };

    if (!schoolId && !onlyForwarded && !district) {
      return res.status(400).json({
        success: false,
        message: 'Provide schoolId, district, or forwardedOnly=true',
      });
    }

    const records = await SchoolConditionRecord.find(filter)
      .sort({ weekNumber: -1, category: 1 })
      .lean();

    // Resolve school names in one query
    const ids = [...new Set(records.map(r => r.schoolId))];
    const schoolDocs = await School.find({ schoolId: { $in: ids } }).lean();
    const nameById = new Map(schoolDocs.map(s => [s.schoolId, s.name]));

    const byKey = new Map();
    for (const r of records) {
      const k = `${r.schoolId}::${r.weekNumber}`;
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(r);
    }

    const bundles = [];
    for (const cats of byKey.values()) {
      const first = cats[0];
      const maxUrgency = Math.max(...cats.map(c => c.lrUrgencyFactor ?? c.priorityScore ?? 0));
      const worst = cats.reduce((a, b) =>
        ((b.lrUrgencyFactor ?? b.priorityScore ?? 0) > (a.lrUrgencyFactor ?? a.priorityScore ?? 0) ? b : a)
      );
      const forwarded = cats.every(c => !!c.forwardedAt);
      const forwardedAt = forwarded
        ? cats.map(c => c.forwardedAt).sort((a, b) => new Date(b) - new Date(a))[0]
        : null;
      const lrFlag = cats.some(c => c.willFailWithin30Days);
      bundles.push({
        schoolId:   first.schoolId,
        schoolName: nameById.get(first.schoolId) || `School ${first.schoolId}`,
        district:   first.district,
        weekNumber: first.weekNumber,
        recordIds: cats.map(c => c._id),
        anchorRecordId: cats[0]._id,
        categories: cats,
        maxUrgency: Math.round(maxUrgency),
        worstCategory: worst.category,
        urgencyLabel: worst.lrUrgencyLabel ||
          (maxUrgency >= 75 ? 'critical' : maxUrgency >= 55 ? 'high' : maxUrgency >= 30 ? 'medium' : 'low'),
        willFailWithin30Days: lrFlag,
        forwarded,
        forwardedAt,
      });
    }

    // For DEO views (forwardedOnly), sort by urgency descending so the most
    // urgent bundle is on top. For principal (schoolId only), sort by week.
    if (onlyForwarded) {
      bundles.sort((a, b) => {
        if (b.maxUrgency !== a.maxUrgency) return b.maxUrgency - a.maxUrgency;
        return new Date(b.forwardedAt || 0) - new Date(a.forwardedAt || 0);
      });
    } else {
      bundles.sort((a, b) => b.weekNumber - a.weekNumber);
    }

    res.json({ success: true, bundles, total: bundles.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/reports/weekly/:schoolId/:weekNumber/forward
 * Bundled forward: marks every category record for that week as forwarded,
 * creates / updates MaintenanceDecisions and emits a single socket event
 * to the DEO room. Used by the principal "Send to DEO" button.
 */
export const forwardWeeklyReport = async (req, res) => {
  try {
    const schoolId   = Number(req.params.schoolId);
    const weekNumber = Number(req.params.weekNumber);
    if (!schoolId || !weekNumber) {
      return res.status(400).json({
        success: false,
        message: 'schoolId and weekNumber path params are required',
      });
    }

    const records = await SchoolConditionRecord.find({ schoolId, weekNumber });
    if (!records.length) {
      return res.status(404).json({ success: false, message: 'No records for this week' });
    }

    const school = await School.findOne({ schoolId }).lean();
    const district = school?.district || records[0].district;
    const userId = req.user?._id || req.user?.id;
    const now = new Date();

    const decisions = [];
    for (const doc of records) {
      doc.forwardedAt = now;
      doc.forwardedBy = userId;
      await doc.save();
      const decision = await scoreAndCreateMaintenanceDecision(doc, school);
      if (decision) decisions.push(decision);
    }

    // Sort returned decisions by urgency (LR-driven), descending
    decisions.sort((a, b) =>
      (b.decision?.computedPriorityScore || 0) - (a.decision?.computedPriorityScore || 0)
    );

    const io = getIO();
    if (io) {
      const payload = {
        schoolId, district, weekNumber,
        worstCategory:  decisions[0]?.category || records[0].category,
        maxUrgency:     decisions[0]?.decision?.computedPriorityScore || 0,
        recordIds:      records.map(r => r._id),
      };
      io.to(`deo:${district}`).emit('report:forwarded:bundle', payload);
      io.to('admin').emit('report:forwarded:bundle', payload);
    }
    writeAuditLog(req, 'weekly_report_forwarded', 'SchoolConditionRecord', null, {
      schoolId, weekNumber, district, count: records.length,
    });
    refreshDistrict(district);

    res.json({
      success: true,
      message: `Forwarded ${records.length} categor${records.length !== 1 ? 'ies' : 'y'} to DEO`,
      schoolId, weekNumber, district,
      decisions,
    });
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
    refreshDistrict(district);

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