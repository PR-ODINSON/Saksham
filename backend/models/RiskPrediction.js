import mongoose from 'mongoose';

/**
 * Stores per-category failure predictions for each school.
 * Upserted every time a new condition report is submitted (or on CSV load).
 * One document per (schoolId, category) — always holds the latest prediction.
 */
const riskPredictionSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['plumbing', 'electrical', 'structural'],
      required: true,
    },
    // 0–100 composite risk score
    riskScore: { type: Number, required: true, min: 0, max: 100 },
    // Predicted days to failure: 30 (high) | 45 (medium) | 60 (low)
    failureWindow: { type: Number, enum: [30, 45, 60], required: true },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    // Human-readable explanation of why the score was assigned
    reason: { type: String, required: true },
    predictedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound unique index — one prediction per school per category
riskPredictionSchema.index({ schoolId: 1, category: 1 }, { unique: true });

export default mongoose.model('RiskPrediction', riskPredictionSchema);
