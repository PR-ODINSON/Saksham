import mongoose from 'mongoose';

/**
 * WorkOrder Schema
 * Stores work assignments generated from maintenance decisions.
 */
const workOrderSchema = new mongoose.Schema({
  decisionId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'MaintenanceDecision',
    required: false,
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
    required: [true, 'Category (e.g., electrical, plumbing) is required']
  },
  assignment: {
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    }
  },
  priorityScore: {
    type: Number,
    required: [true, 'Priority score is required']
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'assigned', 'in_progress', 'completed', 'delayed', 'cancelled'],
      message: '{VALUE} is not a valid status',
    },
    default: 'pending',
    required: true
  },
  deadline: {
    type: Date,
    required: [true, 'Deadline date is required']
  },
  // ADDED: Lifecycle tracking for ML and audit trails
  startedAt: Date,
  completedAt: Date,
  completionProof: {
    photoUrl: String,
    gpsLocation: {
      lat: Number,
      lng: Number
    }
  }
}, {
  timestamps: true,
  collection: 'work_orders'
});

// Index for optimizing queries for specific staff members and their active tasks
workOrderSchema.index({ 'assignment.assignedTo': 1, status: 1 });

const WorkOrder = mongoose.model('WorkOrder', workOrderSchema);

export default WorkOrder;
