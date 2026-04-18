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
  photoUrl: String
}, {
  timestamps: true,
  collection: 'repair_logs'
});

// Compound index for optimizing reporting based on school and time
repairLogSchema.index({ schoolId: 1, createdAt: -1 });

const RepairLog = mongoose.model('RepairLog', repairLogSchema);

export default RepairLog;
