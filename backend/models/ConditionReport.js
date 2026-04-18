import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['plumbing', 'electrical', 'structural', 'sanitation', 'furniture'],
      required: true,
    },
    subCategory: { type: String }, // e.g. "roof", "wiring", "toilet"
    condition: {
      type: String,
      enum: ['good', 'moderate', 'poor'],
      required: true,
    },
    notes: { type: String, maxlength: 500 },
    imageUrl: { type: String },
  },
  { _id: false }
);

const conditionReportSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // Optional — CSV-imported reports have no user submitter
    },
    weekOf: { type: Date, required: true }, // Start of the reporting week
    items: { type: [itemSchema], required: true },
    overallNotes: { type: String, maxlength: 1000 },
    // Computed at save time
    riskScore: { type: Number, default: 0 },
    riskLevel: {
      type: String,
      enum: ['low', 'moderate', 'high', 'critical'],
      default: 'low',
    },
  },
  { timestamps: true }
);

conditionReportSchema.index({ schoolId: 1, weekOf: -1 });

export default mongoose.model('ConditionReport', conditionReportSchema);
