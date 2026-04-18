import School from '../models/School.js';
import ConditionReport from '../models/ConditionReport.js';
import { analyseSchool, prioritiseQueue } from '../services/predictionEngine.js';

// GET /api/risk-scores?district=xxx
export const getRiskScores = async (req, res) => {
  try {
    const { district } = req.query;
    const filter = district ? { district } : {};
    const schools = await School.find(filter);

    const results = await Promise.all(
      schools.map(async (school) => {
        const reports = await ConditionReport.find({ schoolId: school._id })
          .sort({ weekOf: -1 })
          .limit(8);
        const analysis = analyseSchool(reports, school.buildingAge);
        return { school, analysis };
      })
    );

    // Update cached scores in background (don't await)
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

    const reports = await ConditionReport.find({ schoolId: school._id })
      .sort({ weekOf: -1 })
      .limit(8);

    const analysis = analyseSchool(reports, school.buildingAge);
    res.json({ success: true, school, analysis });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/maintenance-queue?district=xxx&category=electrical
export const getMaintenanceQueue = async (req, res) => {
  try {
    const { district, category, minScore = 0 } = req.query;
    const schoolFilter = district ? { district } : {};
    const schools = await School.find(schoolFilter);

    const results = await Promise.all(
      schools.map(async (school) => {
        const reports = await ConditionReport.find({ schoolId: school._id })
          .sort({ weekOf: -1 })
          .limit(8);
        const analysis = analyseSchool(reports, school.buildingAge);
        return { school, analysis };
      })
    );

    let queue = prioritiseQueue(results).filter(
      (item) => item.riskScore >= Number(minScore)
    );

    if (category) {
      queue = queue.filter(
        (item) =>
          item.worstCategory === category ||
          (item.breakdown && item.breakdown[category])
      );
    }

    res.json({ success: true, queue, total: queue.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
