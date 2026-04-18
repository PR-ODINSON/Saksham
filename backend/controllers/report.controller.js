/**
 * Report controller — PS-03
 * POST /api/reports  → creates a SchoolConditionRecord + runs ML prediction
 * GET  /api/reports/:school_id → returns records for one school
 */
import { SchoolConditionRecord } from '../models/index.js';
import { predictRiskForCategory } from '../services/predictionEngine.js';

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

    // Image URL from multer upload (optional)
    const photoUploaded = !!(req.files?.length || req.file || parseBool(req.body.photoUploaded));

    const record = await SchoolConditionRecord.findOneAndUpdate(
      { schoolId: Number(schoolId), category, weekNumber: Number(weekNumber) },
      {
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
        photoUploaded,
      },
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
