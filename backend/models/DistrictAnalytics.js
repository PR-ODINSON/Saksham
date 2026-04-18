import mongoose from 'mongoose';

/**
 * District Analytics Schema
 * Aggregated analytics for school infrastructure at the district level.
 */
const districtAnalyticsSchema = new mongoose.Schema({
  district: {
    type: String,
    required: [true, 'District name is required'],
    index: true
  },
  totalSchools: {
    type: Number,
    required: true,
    default: 0
  },
  avgConditionScore: {
    type: Number,
    required: true,
    default: 0
  },
  highPriorityCount: {
    type: Number,
    required: true,
    default: 0
  },
  failureWithin30DaysCount: {
    type: Number,
    required: true,
    default: 0
  },
  failureWithin60DaysCount: {
    type: Number,
    required: true,
    default: 0
  },
  categoryBreakdown: {
    plumbing: {
      type: Number,
      required: true,
      default: 0
    },
    electrical: {
      type: Number,
      required: true,
      default: 0
    },
    structural: {
      type: Number,
      required: true,
      default: 0
    }
  },
  slaBreachCount: {
    type: Number,
    required: true,
    default: 0
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'district_analytics'
});

const DistrictAnalytics = mongoose.model('DistrictAnalytics', districtAnalyticsSchema);

export default DistrictAnalytics;
