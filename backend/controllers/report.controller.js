/**
 * Report controller — PS-03
 * POST /api/reports  → creates a SchoolConditionRecord
 * GET  /api/reports/:school_id → returns records for one school
 */
import { SchoolConditionRecord } from '../models/index.js';

const VALID_CATEGORIES = ['plumbing', 'electrical', 'structural'];
const VALID_CONDITIONS = [1, 2, 3, 4, 5]; // conditionScore 1–5

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
    const photoUploaded = !!(req.file || req.body.photoUploaded);

    const record = await SchoolConditionRecord.findOneAndUpdate(
      { schoolId: Number(schoolId), category, weekNumber: Number(weekNumber) },
      {
        schoolId: Number(schoolId), district, block, schoolType,
        isGirlsSchool: Boolean(isGirlsSchool),
        numStudents: Number(numStudents) || 0,
        buildingAge:  Number(buildingAge)  || 0,
        materialType, weatherZone, category,
        weekNumber: Number(weekNumber),
        conditionScore: Number(conditionScore),
        issueFlag: Boolean(issueFlag),
        waterLeak: Boolean(waterLeak),
        wiringExposed: Boolean(wiringExposed),
        crackWidthMM: Number(crackWidthMM) || 0,
        toiletFunctionalRatio: Number(toiletFunctionalRatio) || 0,
        powerOutageHours: Number(powerOutageHours) || 0,
        roofLeakFlag: Boolean(roofLeakFlag),
        photoUploaded,
      },
      { upsert: true, new: true, runValidators: true },
    );

    res.status(201).json({ success: true, record });
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
