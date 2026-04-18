import mongoose from 'mongoose';

const conditionItemSchema = new mongoose.Schema(
  {
    category:    { type: String, enum: ['plumbing', 'electrical', 'structural', 'sanitation', 'furniture'] },
    subCategory: String,
    condition:   { type: String, enum: ['good', 'moderate', 'poor'] },
    notes:       String,
  },
  { _id: false },
);

const conditionReportSchema = new mongoose.Schema(
  {
    schoolId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'School',
      required: true,
      index:    true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    },
    weekOf: {
      type:     Date,
      required: true,
    },
    items:        [conditionItemSchema],
    overallNotes: String,
    riskScore:    Number,
    riskLevel: {
      type: String,
      enum: ['low', 'moderate', 'high', 'critical'],
    },
  },
  {
    timestamps: true,
    collection: 'condition_reports',
  },
);

conditionReportSchema.index({ schoolId: 1, weekOf: -1 });

const ConditionReport = mongoose.model('ConditionReport', conditionReportSchema);

export default ConditionReport;
