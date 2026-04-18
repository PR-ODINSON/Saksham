/**
 * Risk & Maintenance Queue controller — PS-03
 *
 * Reads from SchoolConditionRecord + MaintenanceDecision (pre-computed in CSV load).
 * For per-school queries, also runs predictRiskForCategory() live to surface:
 *   - evidence[]              (cited inputs that drove the score)
 *   - estimated_days_to_failure (computed from deterioration rate)
 *   - within_30_days / within_60_days
 *   - deterioration_rate
 */
import { SchoolConditionRecord, MaintenanceDecision } from '../models/index.js';
import { predictRiskForCategory } from '../services/predictionEngine.js';

// ─── GET /api/risk/:school_id ─────────────────────────────────────────────────
// Per-category live prediction + evidence for one school.
export const getRiskBySchool = async (req, res) => {
  try {
    const schoolId = Number(req.params.school_id);
    if (isNaN(schoolId)) {
      return res.status(400).json({ success: false, message: 'school_id must be a number' });
    }

    // Fetch ALL records for this school (all weeks) — needed for slope computation
    const allRecords = await SchoolConditionRecord.find({ schoolId })
      .sort({ weekNumber: 1 })   // ascending → correct order for slope regression
      .lean();

    if (!allRecords.length) {
      return res.status(404).json({ success: false, message: 'No records found for this school' });
    }

    // Group records by category
    const byCategory = {};
    for (const r of allRecords) {
      if (!byCategory[r.category]) byCategory[r.category] = [];
      byCategory[r.category].push(r);
    }

    // Build school-level context from the latest record of any category
    const latestAny = allRecords[allRecords.length - 1];
    const schoolInfo = {
      schoolId:      latestAny.schoolId,
      district:      latestAny.district,
      block:         latestAny.block,
      buildingAge:   latestAny.buildingAge,
      weatherZone:   latestAny.weatherZone,
      isGirlsSchool: latestAny.isGirlsSchool,
      numStudents:   latestAny.numStudents,
    };

    // Run predictRiskForCategory() for each category (live engine call)
    const predictions = await Promise.all(
      Object.entries(byCategory).map(async ([category, records]) => {
        const latestRecord = records[records.length - 1]; // most recent week

        const weekHistory = records.map(r => ({
          conditionScore: r.conditionScore,
          weekNumber:     r.weekNumber,
        }));

        const prediction = await predictRiskForCategory({
          weekHistory,
          buildingAge:   latestRecord.buildingAge   ?? 20,
          weatherZone:   latestRecord.weatherZone   ?? 'Dry',
          category,
          isGirlsSchool: latestRecord.isGirlsSchool ?? false,
          numStudents:   latestRecord.numStudents    ?? 0,
          flags: {
            waterLeak:             latestRecord.waterLeak,
            wiringExposed:         latestRecord.wiringExposed,
            roofLeakFlag:          latestRecord.roofLeakFlag,
            issueFlag:             latestRecord.issueFlag,
            crackWidthMM:          latestRecord.crackWidthMM,
            toiletFunctionalRatio: latestRecord.toiletFunctionalRatio,
            powerOutageHours:      latestRecord.powerOutageHours,
          },
        });

        return {
          category,
          // Stored ground-truth values from CSV (kept for reference)
          storedConditionScore:      latestRecord.conditionScore,
          storedPriorityScore:       latestRecord.priorityScore,
          storedDaysToFailure:       latestRecord.daysToFailure,
          storedWithin30Days:        latestRecord.willFailWithin30Days,
          storedWithin60Days:        latestRecord.willFailWithin60Days,
          weekNumber:                latestRecord.weekNumber,
          issueFlags: {
            waterLeak:    latestRecord.waterLeak,
            wiringExposed: latestRecord.wiringExposed,
            roofLeakFlag: latestRecord.roofLeakFlag,
          },
          // Live engine output
          riskScore:                 prediction.riskScore,
          riskLevel:                 prediction.riskLevel,
          estimated_days_to_failure: prediction.estimated_days_to_failure,
          within_30_days:            prediction.within_30_days,
          within_60_days:            prediction.within_60_days,
          deterioration_rate:        prediction.deterioration_rate,
          failureWindow:             prediction.failureWindow,
          evidence:                  prediction.evidence,
          reason:                    prediction.reason,
          weeksOfData:               records.length,
        };
      })
    );

    // Sort by riskScore descending so highest-risk category comes first
    predictions.sort((a, b) => b.riskScore - a.riskScore);

    res.json({ success: true, school: schoolInfo, predictions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/risk/all ────────────────────────────────────────────────────────
// All latest predictions across every school/category (uses stored values).
export const getAllRisks = async (req, res) => {
  try {
    const { district, category, minScore = 0 } = req.query;

    const filter = { priorityScore: { $gte: Number(minScore) } };
    if (district) filter.district = district;
    if (category) filter.category = category;

    // Latest week per (schoolId, category) via aggregation
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

    // Annotate each record with a quick evidence summary built from stored flags
    const annotated = latest.map(r => ({
      ...r,
      evidence: buildQuickEvidence(r),
      within_30_days: r.willFailWithin30Days,
      within_60_days: r.willFailWithin60Days,
    }));

    res.json({ success: true, predictions: annotated, total: annotated.length });
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
      {
        $lookup: {
          from: 'schools',
          localField: 'schoolId',
          foreignField: 'schoolId',
          as: 'schoolInfo'
        }
      },
      { $unwind: { path: '$schoolInfo', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'school_condition_records',
          localField: 'recordId',
          foreignField: '_id',
          as: 'conditionRecord'
        }
      },
      { $unwind: { path: '$conditionRecord', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$schoolId',
          schoolId:           { $first: '$schoolId' },
          schoolName:         { $first: '$schoolInfo.name' },
          district:           { $first: '$district' },
          block:              { $first: '$schoolInfo.block' },
          isGirlsSchool:      { $first: '$impact.isGirlsSchool' },
          studentImpactScore: { $first: '$impact.studentsAffected' },
          categories:         { $addToSet: '$category' },
          maxPriorityScore:   { $max: '$decision.computedPriorityScore' },
          minDaysToFailure:   { $min: '$conditionRecord.daysToFailure' },
          allEvidence:        { $push: '$explainability.reasons' },
          decisions:          { $push: '$$ROOT' }
        }
      },
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
          schoolId: 1, schoolName: 1, district: 1, block: 1,
          isGirlsSchool: 1, studentImpactScore: 1, categories: 1,
          highestPriorityCategory: '$highestPriorityCategory.category',
          daysToFailure:  '$minDaysToFailure',
          priorityScore:  '$maxPriorityScore',
          topEvidence:    1,
          within_30_days: { $lte: ['$minDaysToFailure', 30] },
          within_60_days: { $lte: ['$minDaysToFailure', 60] },
        }
      },
      { $match: { daysToFailure: { $lte: Number(urgency) } } },
      { $sort: { priorityScore: -1 } }
    ];

    if (block) {
      pipeline.push({ $match: { block } });
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
          _id:           '$schoolId',
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a quick evidence array from a stored SchoolConditionRecord document.
 * Used by getAllRisks() to avoid re-running the full engine on bulk queries.
 */
function buildQuickEvidence(r) {
  const ev = [];
  ev.push(`condition_score = ${r.conditionScore}/5 in week ${r.weekNumber}`);
  if (r.willFailWithin30Days) ev.push('failure predicted within 30 days');
  else if (r.willFailWithin60Days) ev.push('failure predicted within 60 days');
  if (r.buildingAge > 20) ev.push(`building_age = ${r.buildingAge} years`);
  if (r.weatherZone && r.weatherZone !== 'Dry') ev.push(`weather_zone = ${r.weatherZone}`);
  if (r.waterLeak)     ev.push('water_leak = true');
  if (r.wiringExposed) ev.push('wiring_exposed = true');
  if (r.roofLeakFlag)  ev.push('roof_leak_flag = true');
  if (r.slaBreach)     ev.push('sla_breach = true');
  if (r.isGirlsSchool && r.category === 'plumbing') {
    ev.push("girls_school = true + category = plumbing → PS-03 priority boost");
  }
  return ev;
}
