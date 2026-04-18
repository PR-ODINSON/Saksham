import mongoose from 'mongoose';

const maintenanceDecisionSchema = new mongoose.Schema({
  recordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolConditionRecord',
    required: [true, 'Record ID is required']
  },
  schoolId: {
    type: Number,
    required: [true, 'School ID is required']
  },
  district: {
    type: String,
    required: [true, 'District is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required']
  },
  weekNumber: {
    type: Number,
    required: [true, 'Week number is required']
  },

  // Decision Logic
  decision: {
    computedPriorityScore: {
      type: Number,
      required: [true, 'Computed priority score is required']
    },
    priorityLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      required: [true, 'Priority level is required']
    }
  },

  // Impact Assessment
  impact: {
    studentsAffected: {
      type: Number,
      default: 0
    },
    isGirlsSchool: {
      type: Boolean,
      default: false
    },
    criticalFacility: {
      type: Boolean,
      default: false
    }
  },

  // Explainability
  explainability: {
    reasons: {
      type: [String],
      default: []
    }
  },

  // Current Status
  status: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'assigned', 'completed'],
      default: 'pending',
      required: true
    }
  }
}, {
  timestamps: true,
  collection: 'maintenance_decisions'
});

// Index on priorityScore descending for quick sorting of critical issues
maintenanceDecisionSchema.index({ 'decision.computedPriorityScore': -1 });

const MaintenanceDecision = mongoose.model('MaintenanceDecision', maintenanceDecisionSchema);

export default MaintenanceDecision;
