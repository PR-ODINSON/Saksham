import mongoose from 'mongoose';

/**
 * RepairLog Schema
 * Tracks the "before" and "after" state of school infrastructure after a repair is completed.
 */
const repairLogSchema = new mongoose.Schema({
  workOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkOrder',
    required: [true, 'Work Order reference is required'],
    index: true
  },
  // ADDED: Link to maintenance decision for better ML traceability
  decisionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MaintenanceDecision'
  },
  schoolId: {
    type: Number,
    required: [true, 'School ID is required'],
    index: true
  },
  category: {
    type: String,
    required: [true, 'Category is required']
  },
  before: {
    conditionScore: {
      type: Number,
      required: [true, 'Initial condition score is required']
    },
    issues: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Description of issues before repair is required']
    }
  },
  after: {
    conditionScore: {
      type: Number,
      required: [true, 'Final condition score is required']
    }
  },
  completionTimeDays: {
    type: Number,
    required: [true, 'Time taken to complete (in days) is required']
  },
  contractorDelayDays: {
    type: Number,
    required: [true, 'Contractor delay (in days) is required'],
    default: 0
  },
  slaBreached: {
    type: Boolean,
    required: true,
    default: false
  },
  locationMismatch: {
    type: Boolean,
    default: false
  },
  photoUrl: String,

  /**
   * Prediction feedback — stored when the repair log is created.
   * Enables the model-accuracy endpoint to measure prediction error over time.
   */
  predictionSnapshot: {
    // What the engine predicted BEFORE the repair was made
    riskScore:          { type: Number },   // 0-100 engine risk score
    riskLevel:          { type: String },   // 'low'|'medium'|'high'
    estimatedDaysToFailure: { type: Number },
    within30Days:       { type: Boolean },
    within60Days:       { type: Boolean },
    deteriorationRate:  { type: Number },
    evidence:           { type: [String], default: [] },
  },

  predictionError: {
    // beforeScore: condition score the engine saw (= before.conditionScore)
    beforeConditionScore: { type: Number },
    // afterScore: actual condition after repair (= after.conditionScore)
    afterConditionScore:  { type: Number },
    // delta > 0 means improvement; delta < 0 means repair made things worse
    conditionDelta:       { type: Number },
    // How far off the engine's risk score was from what the post-repair state implies
    // A large positive delta means the engine over-estimated risk (too pessimistic).
    riskScoreDelta:       { type: Number },
    accuracy:             {
      type: String,
      enum: ['overestimated', 'accurate', 'underestimated'],
    },
  },
}, {
  timestamps: true,
  collection: 'repair_logs'
});

// Compound index for optimizing reporting based on school and time
repairLogSchema.index({ schoolId: 1, createdAt: -1 });

const RepairLog = mongoose.model('RepairLog', repairLogSchema);

export default RepairLog;
