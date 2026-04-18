import mongoose from 'mongoose';

const schoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    udiseCode: { type: String, unique: true, sparse: true },
    district: { type: String, required: true },
    block: { type: String },
    address: { type: String },

    // ── PS-03 required fields ─────────────────────────────────────────────
    buildingAge: { type: Number, required: true }, // years
    material: {
      type: String,
      enum: ['RCC', 'Brick', 'Temporary', 'Stone', 'Other'],
      default: 'Other',
    },
    weatherZone: {
      type: String,
      enum: ['Dry', 'Heavy Rain', 'Coastal', 'Semi-Arid', 'Other'],
      default: 'Dry',
    },
    isGirlsSchool: { type: Boolean, default: false },

    // ── Additional demographic fields ─────────────────────────────────────
    studentCount: { type: Number, default: 0 },
    teacherCount: { type: Number, default: 0 },
    totalRooms: { type: Number, default: 0 },
    hasToilets: { type: Boolean, default: true },
    hasElectricity: { type: Boolean, default: true },
    hasWater: { type: Boolean, default: true },

    // ── CSV import reference (original integer school_id) ─────────────────
    csvSchoolId: { type: Number, index: true, sparse: true },

    // ── Cached composite risk (updated after each prediction run) ─────────
    lastRiskScore: { type: Number, default: 0 },
    lastRiskCategory: {
      type: String,
      enum: ['low', 'medium', 'moderate', 'high', 'critical'],
      default: 'low',
    },
    lastAssessedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('School', schoolSchema);
