import School from '../models/School.js';
import ConditionReport from '../models/ConditionReport.js';
import RiskPrediction from '../models/RiskPrediction.js';
import { predictRiskForCategory, analyseSchool, prioritiseQueue } from '../services/predictionEngine.js';

const PS03_CATEGORIES = ['plumbing', 'electrical', 'structural'];

// ─── Shared helper ────────────────────────────────────────────────────────────

/**
 * Compute and upsert risk prediction for one (school, category) pair.
 * Reads last 3 condition reports from DB, runs the prediction engine,
 * stores the result in risk_predictions.
 */
export async function computeAndStoreRisk(schoolId, category) {
  const school = await School.findById(schoolId).lean();
  if (!school) return null;

  // Fetch last 3 weekly reports and extract the relevant category item
  const reports = await ConditionReport.find({ schoolId })
    .sort({ weekOf: -1 })
    .limit(3)
    .lean();

  const conditionHistory = reports.reduce((acc, report) => {
    const item = (report.items || []).find(i => i.category === category);
    if (item) acc.push({ condition: item.condition, weekOf: report.weekOf });
    return acc;
  }, []);

  const { riskScore, failureWindow, riskLevel, reason } = predictRiskForCategory(
    conditionHistory,
    school.buildingAge,
    school.weatherZone,
  );

  // Upsert — always keep the single latest prediction per (school, category)
  const prediction = await RiskPrediction.findOneAndUpdate(
    { schoolId, category },
    { riskScore, failureWindow, riskLevel, reason, predictedAt: new Date() },
    { upsert: true, new: true },
  );

  return prediction;
}

/**
 * Compute + store risk for all 3 categories for one school.
 * Also updates the cached composite score on the School document.
 */
export async function computeAllCategoriesForSchool(schoolId) {
  const predictions = await Promise.all(
    PS03_CATEGORIES.map(cat => computeAndStoreRisk(schoolId, cat)),
  );

  // Update cached score: use max risk score across categories
  const validPredictions = predictions.filter(Boolean);
  if (validPredictions.length > 0) {
    const maxScore = Math.max(...validPredictions.map(p => p.riskScore));
    const maxPred  = validPredictions.find(p => p.riskScore === maxScore);
    await School.findByIdAndUpdate(schoolId, {
      lastRiskScore: maxScore,
      lastRiskCategory: maxPred?.riskLevel ?? 'low',
      lastAssessedAt: new Date(),
    });
  }

  return validPredictions;
}

// ─── PS-03 Spec Endpoints ─────────────────────────────────────────────────────

/**
 * GET /api/risk/:school_id
 * Return stored per-category predictions for a single school.
 */
export const getRiskBySchool = async (req, res) => {
  try {
    const { school_id } = req.params;

    // Accept both MongoDB ObjectId and numeric CSV school_id
    const school = school_id.match(/^[0-9a-fA-F]{24}$/)
      ? await School.findById(school_id)
      : await School.findOne({ csvSchoolId: Number(school_id) });

    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    const predictions = await RiskPrediction.find({ schoolId: school._id })
      .sort({ riskScore: -1 })
      .lean();

    res.json({
      success: true,
      school: {
        id: school._id,
        name: school.name,
        district: school.district,
        buildingAge: school.buildingAge,
        weatherZone: school.weatherZone,
        isGirlsSchool: school.isGirlsSchool,
      },
      predictions,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/risk/all
 * Return all stored predictions across every school and category.
 */
export const getAllRisks = async (req, res) => {
  try {
    const { district, category, minScore = 0 } = req.query;

    // Build a school filter if district is provided
    const schoolFilter = district ? { district } : {};
    const schools = await School.find(schoolFilter).select('_id').lean();
    const schoolIds = schools.map(s => s._id);

    const predFilter = {
      schoolId: { $in: schoolIds },
      riskScore: { $gte: Number(minScore) },
    };
    if (category) predFilter.category = category;

    const predictions = await RiskPrediction.find(predFilter)
      .populate('schoolId', 'name district block isGirlsSchool buildingAge weatherZone')
      .sort({ riskScore: -1 })
      .lean();

    res.json({ success: true, predictions, total: predictions.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/maintenance-queue
 * District-level priority queue sorted by risk_score.
 * Girls-school plumbing gets a significant priority boost (+25 points).
 *
 * Output shape:
 * [{ school_id, schoolName, district, category, priority: 'HIGH'|'MEDIUM'|'LOW', ... }]
 */
export const getMaintenanceQueue = async (req, res) => {
  try {
    const { district, category } = req.query;

    const schoolFilter = district ? { district } : {};
    const schools = await School.find(schoolFilter).lean();
    const schoolIds = schools.map(s => s._id);
    const schoolMap = Object.fromEntries(schools.map(s => [s._id.toString(), s]));

    const predFilter = { schoolId: { $in: schoolIds } };
    if (category) predFilter.category = category;

    const predictions = await RiskPrediction.find(predFilter)
      .sort({ riskScore: -1 })
      .lean();

    const queue = predictions
      .map(p => {
        const school = schoolMap[p.schoolId.toString()];
        let priorityScore = p.riskScore;

        // ── Girls-school plumbing boost (PS-03 requirement) ──────────────
        if (p.category === 'plumbing' && school?.isGirlsSchool) {
          priorityScore = Math.min(100, priorityScore + 25);
        }

        let priority;
        if (priorityScore > 66) priority = 'HIGH';
        else if (priorityScore > 33) priority = 'MEDIUM';
        else priority = 'LOW';

        return {
          school_id: p.schoolId,
          schoolName: school?.name,
          district: school?.district,
          block: school?.block,
          category: p.category,
          risk_score: p.riskScore,
          priority,
          priority_score: priorityScore,
          failure_window: p.failureWindow,
          reason: p.reason,
          is_girls_school: school?.isGirlsSchool ?? false,
        };
      })
      .sort((a, b) => b.priority_score - a.priority_score);

    res.json({ success: true, queue, total: queue.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Legacy Endpoints (kept for existing dashboard) ──────────────────────────

// GET /api/risk-scores?district=xxx
export const getRiskScores = async (req, res) => {
  try {
    const { district } = req.query;
    const filter  = district ? { district } : {};
    const schools = await School.find(filter);

    const results = await Promise.all(
      schools.map(async (school) => {
        const reports  = await ConditionReport.find({ schoolId: school._id })
          .sort({ weekOf: -1 }).limit(8);
        const analysis = analyseSchool(reports, school.buildingAge);
        return { school, analysis };
      }),
    );

    for (const { school, analysis } of results) {
      School.findByIdAndUpdate(school._id, {
        lastRiskScore: analysis.score,
        lastRiskCategory: analysis.level,
        lastAssessedAt: new Date(),
      }).catch(() => {});
    }

    const queue = prioritiseQueue(results);
    res.json({ success: true, riskScores: queue });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/risk-scores/:schoolId
export const getSchoolRisk = async (req, res) => {
  try {
    const school = await School.findById(req.params.schoolId);
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });

    const reports  = await ConditionReport.find({ schoolId: school._id })
      .sort({ weekOf: -1 }).limit(8);
    const analysis = analyseSchool(reports, school.buildingAge);

    res.json({ success: true, school, analysis });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
