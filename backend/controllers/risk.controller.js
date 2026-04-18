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

// ─── GET /api/risk/queue ──────────────────────────────────────────────────────
// District-level priority queue aggregated by school.
export const getMaintenanceQueue = async (req, res) => {
  try {
    const { district, block, category, urgency = 60 } = req.query;

    const filter = { status: 'pending' };
    if (district) filter.district = district;
    if (category) filter.category = category;

    const pipeline = [
      { $match: filter },
      // Join with School records to get name and block
      {
        $lookup: {
          from: 'schools',
          localField: 'schoolId',
          foreignField: 'schoolId',
          as: 'schoolInfo'
        }
      },
      { $unwind: { path: '$schoolInfo', preserveNullAndEmptyArrays: true } },
      // Join with SchoolConditionRecord to get daysToFailure
      {
        $lookup: {
          from: 'school_condition_records',
          localField: 'recordId',
          foreignField: '_id',
          as: 'conditionRecord'
        }
      },
      { $unwind: { path: '$conditionRecord', preserveNullAndEmptyArrays: true } },
      // Group by school
      {
        $group: {
          _id: '$schoolId',
          schoolId: { $first: '$schoolId' },
          schoolName: { $first: '$schoolInfo.name' },
          district: { $first: '$district' },
          block: { $first: '$schoolInfo.block' },
          isGirlsSchool: { $first: '$impact.isGirlsSchool' },
          studentImpactScore: { $first: '$impact.studentsAffected' },
          categories: { $addToSet: '$category' },
          maxPriorityScore: { $max: '$decision.computedPriorityScore' },
          minDaysToFailure: { $min: '$conditionRecord.daysToFailure' },
          allEvidence: { $push: '$explainability.reasons' },
          decisions: { $push: '$$ROOT' }
        }
      },
      // Flatten evidence and determine highest priority category
      {
        $addFields: {
          topEvidence: {
            $slice: [
              {
                $reduce: {
                  input: '$allEvidence',
                  initialValue: [],
                  in: { $concatArrays: ['$$value', '$$this'] }
                }
              },
              5
            ]
          },
          highestPriorityCategory: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$decisions',
                  as: 'd',
                  cond: { $eq: ['$$d.decision.computedPriorityScore', '$maxPriorityScore'] }
                }
              },
              0
            ]
          }
        }
      },
      {
        $project: {
          _id: 0,
          schoolId: 1,
          schoolName: 1,
          district: 1,
          block: 1,
          isGirlsSchool: 1,
          studentImpactScore: 1,
          categories: 1,
          highestPriorityCategory: '$highestPriorityCategory.category',
          daysToFailure: '$minDaysToFailure',
          priorityScore: '$maxPriorityScore',
          topEvidence: 1
        }
      },
      // Filter by urgency (days to failure)
      { $match: { daysToFailure: { $lte: Number(urgency) } } },
      { $sort: { priorityScore: -1 } }
    ];

    if (block) {
      pipeline.push({ $match: { block: block } });
    }

    const queue = await MaintenanceDecision.aggregate(pipeline);

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
