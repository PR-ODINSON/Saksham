import ConditionReport from '../models/ConditionReport.js';
import School from '../models/School.js';
import User from '../models/user.model.js';
import { analyseSchool, riskLevel, scoreReportItems } from '../services/predictionEngine.js';
import { computeAndStoreRisk } from './risk.controller.js';

const PS03_CATEGORIES = ['plumbing', 'electrical', 'structural'];

// POST /api/condition-report  (alias: POST /api/reports)
export const submitReport = async (req, res) => {
  try {
    const { schoolId, weekOf, items, overallNotes } = req.body;

    if (!schoolId || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'schoolId and items are required' });
    }

    // Validate category + condition values only (no free text)
    const VALID_CATEGORIES  = ['plumbing', 'electrical', 'structural', 'sanitation', 'furniture'];
    const VALID_CONDITIONS  = ['good', 'moderate', 'poor'];
    for (const item of items) {
      if (!VALID_CATEGORIES.includes(item.category)) {
        return res.status(400).json({ success: false, message: `Invalid category: ${item.category}` });
      }
      if (!VALID_CONDITIONS.includes(item.condition)) {
        return res.status(400).json({ success: false, message: `Invalid condition: ${item.condition}` });
      }
    }

    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });

    // Handle optional image uploads (multer attaches req.files)
    const fileUrls = (req.files || []).map(f => `/uploads/${f.filename}`);

    // Attach image_url to the first item that has no imageUrl, or just log it
    const enrichedItems = items.map((item, idx) => ({
      ...item,
      imageUrl: item.imageUrl || fileUrls[idx] || undefined,
    }));

    const score = scoreReportItems(enrichedItems);
    const level = riskLevel(score);

    const report = await ConditionReport.create({
      schoolId,
      submittedBy: req.user?.id || undefined,
      weekOf: weekOf ? new Date(weekOf) : getWeekStart(),
      items: enrichedItems,
      overallNotes,
      riskScore: score,
      riskLevel: level,
    });

    // ── Trigger per-category predictions (PS-03 pipeline) ─────────────────
    // Run in background so response is fast; only for PS-03 categories
    const affectedCategories = [
      ...new Set(enrichedItems.map(i => i.category).filter(c => PS03_CATEGORIES.includes(c))),
    ];
    for (const cat of affectedCategories) {
      computeAndStoreRisk(schoolId, cat).catch(() => {});
    }

    // Also refresh the composite cached score for the school dashboard
    const recentReports = await ConditionReport.find({ schoolId })
      .sort({ weekOf: -1 })
      .limit(4);
    const analysis = analyseSchool(recentReports, school.buildingAge);
    School.findByIdAndUpdate(schoolId, {
      lastRiskScore:    analysis.score,
      lastRiskCategory: analysis.level,
      lastAssessedAt:   new Date(),
    }).catch(() => {});

    res.status(201).json({ success: true, report, analysis });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/condition-report?schoolId=xxx&limit=8  (alias: GET /api/reports/:school_id)
export const getReports = async (req, res) => {
  try {
    const { schoolId, limit = 8 } = req.query;

    // School-role users can only see their own school's reports
    let resolvedSchoolId = schoolId;
    if (req.user?.role === 'school') {
      const user = await User.findById(req.user.id);
      resolvedSchoolId = user?.schoolId?.toString();
    }

    const filter  = resolvedSchoolId ? { schoolId: resolvedSchoolId } : {};
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

// GET /api/reports/:school_id  — spec endpoint, returns reports for one school
export const getReportsBySchool = async (req, res) => {
  try {
    const { school_id } = req.params;

    const school = school_id.match(/^[0-9a-fA-F]{24}$/)
      ? await School.findById(school_id)
      : await School.findOne({ csvSchoolId: Number(school_id) });

    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    const reports = await ConditionReport.find({ schoolId: school._id })
      .sort({ weekOf: -1 })
      .limit(12)
      .populate('submittedBy', 'name')
      .lean();

    res.json({ success: true, reports, total: reports.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Helper ──────────────────────────────────────────────────────────────────

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff));
}
