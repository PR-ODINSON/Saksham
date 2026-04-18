import mongoose from 'mongoose';

/**
 * PriorityConfig Model
 * ADDED: Support for dynamic tuning of maintenance scoring logic.
 * Only one document can be active at a time to ensure scoring consistency.
 */
const priorityConfigSchema = new mongoose.Schema({
  conditionWeights: {
    good: { type: Number, default: 10 },
    minor: { type: Number, default: 30 },
    major: { type: Number, default: 60 },
    critical: { type: Number, default: 90 }
  },
  multipliers: {
    girlsSchool: { type: Number, default: 1.5 },
    criticalFacility: { type: Number, default: 1.6 },
    studentImpact: { type: Number, default: 1.4 }
  },
  maxPriorityScore: {
    type: Number,
    default: 100
  },
  version: {
    type: String,
    required: [true, 'Version is required']
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'priority_config'
});

/**
 * Enforce single active configuration.
 * Partial index ensures only one document can have isActive: true.
 */
priorityConfigSchema.index(
  { isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

const PriorityConfig = mongoose.model('PriorityConfig', priorityConfigSchema);

export default PriorityConfig;
