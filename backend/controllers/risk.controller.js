/**
 * Risk & Maintenance Queue controller — PS-03
 * Now reads from SchoolConditionRecord + MaintenanceDecision
 * (predictions are pre-computed in CSV load, stored in those collections).
 */
import { SchoolConditionRecord, MaintenanceDecision } from '../models/index.js';

// ─── GET /api/risk/:school_id ─────────────────────────────────────────────────
// Per-category prediction data for one school (from SchoolConditionRecord).
export const getRiskBySchool = async (req, res) => {
  try {
    const schoolId = Number(req.params.school_id);
    if (isNaN(schoolId)) {
      return res.status(400).json({ success: false, message: 'school_id must be a number' });
    }

    const records = await SchoolConditionRecord.find({ schoolId })
      .sort({ weekNumber: -1 })
      .lean();

    if (!records.length) {
      return res.status(404).json({ success: false, message: 'No records found for this school' });
    }

    // Latest record per category
    const latestByCategory = {};
    for (const r of records) {
      if (!latestByCategory[r.category]) latestByCategory[r.category] = r;
    }

    const predictions = Object.values(latestByCategory).map(r => ({
      category:            r.category,
      conditionScore:      r.conditionScore,
      daysToFailure:       r.daysToFailure,
      willFailWithin30Days: r.willFailWithin30Days,
      willFailWithin60Days: r.willFailWithin60Days,
      priorityScore:       r.priorityScore,
      weekNumber:          r.weekNumber,
      issueFlags: {
        waterLeak:    r.waterLeak,
        wiringExposed: r.wiringExposed,
        roofLeakFlag: r.roofLeakFlag,
      },
    }));

    const schoolInfo = {
      schoolId:    records[0].schoolId,
      district:    records[0].district,
      block:       records[0].block,
      buildingAge: records[0].buildingAge,
      weatherZone: records[0].weatherZone,
      isGirlsSchool: records[0].isGirlsSchool,
    };

    res.json({ success: true, school: schoolInfo, predictions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/risk/all ────────────────────────────────────────────────────────
// All latest predictions across every school/category.
export const getAllRisks = async (req, res) => {
  try {
    const { district, category, minScore = 0 } = req.query;

    const filter = { priorityScore: { $gte: Number(minScore) } };
    if (district) filter.district = district;
    if (category) filter.category = category;

    // Get latest week per (schoolId, category) using aggregation
    const latest = await SchoolConditionRecord.aggregate([
      { $match: filter },
      { $sort: { weekNumber: -1 } },
      {
        $group: {
          _id: { schoolId: '$schoolId', category: '$category' },
          doc: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$doc' } },
      { $sort: { priorityScore: -1 } },
    ]);

    res.json({ success: true, predictions: latest, total: latest.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/maintenance-queue ───────────────────────────────────────────────
// District-level priority queue from MaintenanceDecision.
// Girls-school plumbing boost (+15) is already applied during CSV load.
export const getMaintenanceQueue = async (req, res) => {
  try {
    const { district, category, status = 'pending' } = req.query;

    const filter = { 'status.status': status };
    if (district) filter.district = district;
    if (category) filter.category = category;

    const decisions = await MaintenanceDecision.find(filter)
      .sort({ 'decision.computedPriorityScore': -1 })
      .lean();

    const queue = decisions.map(d => ({
      school_id:     d.schoolId,
      district:      d.district,
      category:      d.category,
      weekNumber:    d.weekNumber,
      priority:      d.decision.priorityLevel.toUpperCase(),
      priority_score: d.decision.computedPriorityScore,
      is_girls_school: d.impact.isGirlsSchool,
      students_affected: d.impact.studentsAffected,
      reasons:       d.explainability.reasons,
      status:        d.status.status,
    }));

    res.json({ success: true, queue, total: queue.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Legacy: GET /api/risk-scores ────────────────────────────────────────────
export const getRiskScores = async (req, res) => {
  try {
    const { district } = req.query;
    const filter = {};
    if (district) filter.district = district;

    const scores = await SchoolConditionRecord.aggregate([
      { $match: filter },
      { $sort: { weekNumber: -1 } },
      {
        $group: {
          _id: '$schoolId',
          district:      { $first: '$district' },
          maxPriority:   { $max: '$priorityScore' },
          fail30:        { $max: { $cond: ['$willFailWithin30Days', 1, 0] } },
          buildingAge:   { $first: '$buildingAge' },
          isGirlsSchool: { $first: '$isGirlsSchool' },
        },
      },
      { $sort: { maxPriority: -1 } },
    ]);

    res.json({ success: true, riskScores: scores });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
