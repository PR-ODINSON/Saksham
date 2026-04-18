import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['school', 'deo', 'contractor', 'admin'],
      default: 'school',
    },
    // School-specific
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
    // Contractor-specific
    district: { type: String },
    phone: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
