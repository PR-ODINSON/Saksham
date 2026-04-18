import mongoose from 'mongoose';

const workOrderSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ConditionReport',
    },
    category: {
      type: String,
      enum: ['plumbing', 'electrical', 'structural', 'sanitation', 'furniture'],
      required: true,
    },
    subCategory: { type: String },
    description: { type: String, required: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    estimatedDays: { type: Number }, // predicted time to failure / urgency
    riskScore: { type: Number, default: 0 },

    // Assignment
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date },

    // Execution
    status: {
      type: String,
      enum: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    dueDate: { type: Date },
    completedAt: { type: Date },
    completionNotes: { type: String },
    completionImageUrl: { type: String },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('WorkOrder', workOrderSchema);
