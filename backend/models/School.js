import mongoose from 'mongoose';

const schoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    udiseCode: { type: String, unique: true, sparse: true },
    district: { type: String, required: true },
    block: { type: String },
    address: { type: String },
    buildingAge: { type: Number, required: true }, // years
    studentCount: { type: Number, default: 0 },
    teacherCount: { type: Number, default: 0 },
    totalRooms: { type: Number, default: 0 },
    hasToilets: { type: Boolean, default: true },
    hasElectricity: { type: Boolean, default: true },
    hasWater: { type: Boolean, default: true },
    // Cached risk score for quick dashboard queries
    lastRiskScore: { type: Number, default: 0 },
    lastRiskCategory: {
      type: String,
      enum: ['low', 'moderate', 'high', 'critical'],
      default: 'low',
    },
    lastAssessedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('School', schoolSchema);
