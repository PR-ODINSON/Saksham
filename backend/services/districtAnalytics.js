/**
 * District analytics — single source of truth.
 *
 * Aggregates `school_condition_records` into a denormalised summary doc per
 * district, stored in `district_analytics`. The DEO dashboard / analytics
 * controller reads from there. Call after every submit / forward so the
 * collection is never stale.
 *
 * Designed to be idempotent and crash-safe: if the recompute throws (network
 * blip, etc.) the original API request is unaffected — see the fire-and-forget
 * pattern in `report.controller.js`.
 */
import { SchoolConditionRecord, DistrictAnalytics, WorkOrder } from '../models/index.js';

/**
 * Recompute analytics for a single district. Returns the upserted doc.
 * @param {string} district
 */
export async function recomputeDistrictAnalytics(district) {
  if (!district) return null;

  // Pull the LATEST record per (school, category) so we don't double-count
  // older weeks. Mongo aggregation handles this in one round-trip.
  const latestPerSchoolCat = await SchoolConditionRecord.aggregate([
    { $match: { district } },
    { $sort: { weekNumber: -1 } },
    {
      $group: {
        _id: { schoolId: '$schoolId', category: '$category' },
        doc: { $first: '$$ROOT' },
      },
    },
    { $replaceRoot: { newRoot: '$doc' } },
  ]);

  if (!latestPerSchoolCat.length) {
    // No data → write a zeroed-out doc so the DEO chart still renders.
    return DistrictAnalytics.findOneAndUpdate(
      { district },
      {
        district,
        totalSchools: 0,
        avgConditionScore: 0,
        highPriorityCount: 0,
        failureWithin30DaysCount: 0,
        failureWithin60DaysCount: 0,
        categoryBreakdown: { plumbing: 0, electrical: 0, structural: 0 },
        slaBreachCount: 0,
        generatedAt: new Date(),
      },
      { upsert: true, new: true },
    );
  }

  const schools = new Set(latestPerSchoolCat.map(r => r.schoolId));
  let condSum = 0, highPriority = 0, fail30 = 0, fail60 = 0;
  const catCount = { plumbing: 0, electrical: 0, structural: 0 };

  for (const r of latestPerSchoolCat) {
    condSum += Number(r.conditionScore || 0);
    const urgency = r.lrUrgencyFactor ?? r.priorityScore ?? 0;
    if (urgency >= 70) highPriority += 1;
    if (r.willFailWithin30Days || r.lrFail30Probability >= 0.5) fail30 += 1;
    if (r.willFailWithin60Days || r.lrFail60Probability >= 0.5) fail60 += 1;
    if (catCount[r.category] !== undefined) catCount[r.category] += 1;
  }

  // SLA breaches: completed work orders that finished after their deadline
  // OR still-open tasks whose deadline is already in the past. The
  // field-vs-field comparison ($completedAt > $deadline) needs an
  // aggregation; a regular .countDocuments would silently miscast.
  const now = new Date();
  const slaBreachAgg = await WorkOrder.aggregate([
    { $match: { district } },
    {
      $match: {
        $or: [
          { $expr: { $and: [
            { $eq: ['$status', 'completed'] },
            { $gt: ['$completedAt', '$deadline'] },
          ] } },
          { status: { $in: ['pending', 'assigned', 'accepted'] }, deadline: { $lt: now } },
        ],
      },
    },
    { $count: 'n' },
  ]);
  const slaBreachCount = slaBreachAgg[0]?.n ?? 0;

  return DistrictAnalytics.findOneAndUpdate(
    { district },
    {
      district,
      totalSchools: schools.size,
      avgConditionScore: +(condSum / latestPerSchoolCat.length).toFixed(2),
      highPriorityCount: highPriority,
      failureWithin30DaysCount: fail30,
      failureWithin60DaysCount: fail60,
      categoryBreakdown: catCount,
      slaBreachCount,
      generatedAt: new Date(),
    },
    { upsert: true, new: true },
  );
}

/**
 * Recompute analytics for every district that currently has at least one
 * condition record. Used by the manual `/api/analytics/recompute` endpoint
 * and by the cleanup script.
 */
export async function recomputeAllDistricts() {
  const districts = await SchoolConditionRecord.distinct('district');
  const results = [];
  for (const d of districts) {
    if (!d) continue;
    const doc = await recomputeDistrictAnalytics(d);
    results.push({ district: d, ok: !!doc });
  }
  return results;
}
