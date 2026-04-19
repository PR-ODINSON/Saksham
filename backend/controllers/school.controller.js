/**
 * School controller — PS-03
 * No standalone School collection anymore.
 * School info is embedded in SchoolConditionRecord.
 * These endpoints aggregate distinct school profiles from those records.
 */
import { SchoolConditionRecord, School, MaintenanceDecision } from '../models/index.js';

function getISOWeek() {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
}

// GET /api/schools
export const getAllSchools = async (req, res) => {
  try {
    const { district } = req.query;
    const match = district ? { district } : {};

    const schools = await School.find(match).lean();

    res.json({ success: true, schools, total: schools.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/schools/:id  (numeric school_id)
export const getSchoolById = async (req, res) => {
  try {
    const schoolId = Number(req.params.id);
    if (isNaN(schoolId)) {
      return res.status(400).json({ success: false, message: 'id must be a number' });
    }

    const school = await School.findOne({ schoolId }).lean();
    
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    const totalRecords = await SchoolConditionRecord.countDocuments({ schoolId });

    const profile = {
      ...school,
      totalRecords,
    };

    res.json({ success: true, school: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/schools/:id/stats
export const getSchoolStats = async (req, res) => {
  try {
    const schoolId = Number(req.params.id);
    if (isNaN(schoolId)) {
      return res.status(400).json({ success: false, message: 'id must be a number' });
    }

    const currentWeek = getISOWeek();

    // 1. Fetch records
    const records = await SchoolConditionRecord.find({ schoolId })
      .select('weekNumber priorityScore category')
      .lean();

    const uniqueWeeks = new Set(records.map(r => r.weekNumber));
    const auditHistory = uniqueWeeks.size;

    // 2. Pending Audits (total week expectations minus weeks submitted)
    const pendingAudits = Math.max(0, currentWeek - auditHistory);

    // 3. Infrastructure Health (100 - max(priorityScore) of latest categories)
    const latestByCategory = {};
    for (const r of records) {
      if (!latestByCategory[r.category] || r.weekNumber > latestByCategory[r.category].weekNumber) {
        latestByCategory[r.category] = r;
      }
    }
    const scores = Object.values(latestByCategory).map(r => r.priorityScore || 0);
    const maxPriority = scores.length > 0 ? Math.max(...scores) : 0;
    const infraHealth = Math.max(0, 100 - Math.round(maxPriority));

    // 4. Critical Risks
    const criticalRisksCount = await MaintenanceDecision.countDocuments({
      schoolId,
      status: 'pending',
      'decision.priorityLevel': { $in: ['high', 'urgent'] }
    });

    res.json({
      success: true,
      stats: {
        infraHealth: `${infraHealth}%`,
        pendingAudits,
        criticalRisks: criticalRisksCount,
        auditHistory
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
