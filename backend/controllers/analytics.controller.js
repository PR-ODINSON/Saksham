import { DistrictAnalytics, RepairLog, SchoolConditionRecord } from '../models/index.js';

export const getDistrictStats = async (req, res) => {
  try {
    const { district } = req.query; // fixed: was 'districtName'

    const filter = {};
    if (district) filter.district = district;

    const stats = await DistrictAnalytics.find(filter)
      .sort({ highPriorityCount: -1 })
      .lean();

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/analytics/model-accuracy
 *
 * Aggregates predictionError deltas from completed repair logs.
 * Groups results by category and district, returning:
 *   - meanAbsoluteError   (average |riskScoreDelta| per group)
 *   - meanConditionDelta  (average improvement from repair)
 *   - accuracyBreakdown   (counts of overestimated / accurate / underestimated)
 *   - totalRepairs        (sample size)
 *
 * This makes the "model learns from repairs" requirement visible and measurable.
 */
export const getModelAccuracy = async (req, res) => {
  try {
    const { district, category } = req.query;

    const matchStage = {
      'predictionError.riskScoreDelta': { $exists: true },
    };
    if (district) matchStage.district = district;
    if (category) matchStage.category = category;

    // Aggregate by category
    const byCategory = await RepairLog.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$category',
          totalRepairs:       { $sum: 1 },
          meanAbsoluteError:  { $avg: { $abs: '$predictionError.riskScoreDelta' } },
          meanConditionDelta: { $avg: '$predictionError.conditionDelta' },
          overestimated:      { $sum: { $cond: [{ $eq: ['$predictionError.accuracy', 'overestimated'] },  1, 0] } },
          accurate:           { $sum: { $cond: [{ $eq: ['$predictionError.accuracy', 'accurate'] },       1, 0] } },
          underestimated:     { $sum: { $cond: [{ $eq: ['$predictionError.accuracy', 'underestimated'] }, 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          totalRepairs: 1,
          meanAbsoluteError:  { $round: ['$meanAbsoluteError',  2] },
          meanConditionDelta: { $round: ['$meanConditionDelta', 2] },
          accuracyBreakdown: {
            overestimated:  '$overestimated',
            accurate:       '$accurate',
            underestimated: '$underestimated',
          },
        },
      },
      { $sort: { meanAbsoluteError: -1 } },
    ]);

    // Aggregate by district
    const byDistrict = await RepairLog.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'school_condition_records',
          let: { sid: '$schoolId', cat: '$category' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$schoolId', '$$sid'] }, { $eq: ['$category', '$$cat'] }] } } },
            { $sort: { weekNumber: -1 } },
            { $limit: 1 },
            { $project: { district: 1 } },
          ],
          as: 'condRecord',
        },
      },
      { $unwind: { path: '$condRecord', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$condRecord.district',
          totalRepairs:       { $sum: 1 },
          meanAbsoluteError:  { $avg: { $abs: '$predictionError.riskScoreDelta' } },
          meanConditionDelta: { $avg: '$predictionError.conditionDelta' },
          overestimated:      { $sum: { $cond: [{ $eq: ['$predictionError.accuracy', 'overestimated'] },  1, 0] } },
          accurate:           { $sum: { $cond: [{ $eq: ['$predictionError.accuracy', 'accurate'] },       1, 0] } },
          underestimated:     { $sum: { $cond: [{ $eq: ['$predictionError.accuracy', 'underestimated'] }, 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          district: '$_id',
          totalRepairs: 1,
          meanAbsoluteError:  { $round: ['$meanAbsoluteError',  2] },
          meanConditionDelta: { $round: ['$meanConditionDelta', 2] },
          accuracyBreakdown: {
            overestimated:  '$overestimated',
            accurate:       '$accurate',
            underestimated: '$underestimated',
          },
        },
      },
      { $sort: { meanAbsoluteError: -1 } },
    ]);

    // Overall summary
    const overall = await RepairLog.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRepairs:       { $sum: 1 },
          meanAbsoluteError:  { $avg: { $abs: '$predictionError.riskScoreDelta' } },
          meanConditionDelta: { $avg: '$predictionError.conditionDelta' },
          overestimated:      { $sum: { $cond: [{ $eq: ['$predictionError.accuracy', 'overestimated'] },  1, 0] } },
          accurate:           { $sum: { $cond: [{ $eq: ['$predictionError.accuracy', 'accurate'] },       1, 0] } },
          underestimated:     { $sum: { $cond: [{ $eq: ['$predictionError.accuracy', 'underestimated'] }, 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          totalRepairs: 1,
          meanAbsoluteError:  { $round: ['$meanAbsoluteError',  2] },
          meanConditionDelta: { $round: ['$meanConditionDelta', 2] },
          accuracyBreakdown: {
            overestimated:  '$overestimated',
            accurate:       '$accurate',
            underestimated: '$underestimated',
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      note: 'meanAbsoluteError is the avg |predicted_risk - implied_post_repair_risk|. Lower = more accurate.',
      overall: overall[0] ?? { totalRepairs: 0, meanAbsoluteError: null, meanConditionDelta: null },
      byCategory,
      byDistrict,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateStats = async (req, res) => {
  try {
    const { district, ...rest } = req.body; // fixed: was 'districtName'

    if (!district) {
      return res.status(400).json({ success: false, error: 'district is required' });
    }

    const stats = await DistrictAnalytics.findOneAndUpdate(
      { district },
      { district, ...rest, generatedAt: new Date() },
      { upsert: true, new: true },
    );
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
