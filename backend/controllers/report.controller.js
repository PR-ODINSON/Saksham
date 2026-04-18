import ConditionReport from '../models/ConditionReport.js';
import School from '../models/School.js';
import User from '../models/user.model.js';
import { analyseSchool, riskLevel, scoreReportItems } from '../services/predictionEngine.js';

// POST /api/condition-report
export const submitReport = async (req, res) => {
  try {
    const { schoolId, weekOf, items, overallNotes } = req.body;

    if (!schoolId || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'schoolId and items are required' });
    }

    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });

    // Compute risk score at submission time
    const score = scoreReportItems(items);
    const level = riskLevel(score);

    const report = await ConditionReport.create({
      schoolId,
      submittedBy: req.user.id,
      weekOf: weekOf ? new Date(weekOf) : getWeekStart(),
      items,
      overallNotes,
      riskScore: score,
      riskLevel: level,
    });

    // Refresh school cached score using last 4 weeks of reports
    const recentReports = await ConditionReport.find({ schoolId })
      .sort({ weekOf: -1 })
      .limit(4);
    const analysis = analyseSchool(recentReports, school.buildingAge);
    await School.findByIdAndUpdate(schoolId, {
      lastRiskScore: analysis.score,
      lastRiskCategory: analysis.level,
      lastAssessedAt: new Date(),
    });

    res.status(201).json({ success: true, report, analysis });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/condition-report?schoolId=xxx&limit=8
export const getReports = async (req, res) => {
  try {
    const { schoolId, limit = 8 } = req.query;

    // School users can only see their own school
    let resolvedSchoolId = schoolId;
    if (req.user.role === 'school') {
      const user = await User.findById(req.user.id);
      resolvedSchoolId = user?.schoolId?.toString();
    }

    const filter = resolvedSchoolId ? { schoolId: resolvedSchoolId } : {};
    const reports = await ConditionReport.find(filter)
      .sort({ weekOf: -1 })
      .limit(Number(limit))
      .populate('submittedBy', 'name')
      .populate('schoolId', 'name district');

    res.json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Helper: get start of current ISO week (Monday)
function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff));
}
