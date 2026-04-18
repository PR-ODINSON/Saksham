import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['peon', 'principal', 'deo', 'contractor', 'admin'],
      default: 'peon',
    },
    district: { type: String },
    phone:    { type: String },
    // numeric CSV school ID (if this user belongs to one school)
    schoolId: { type: Number },
  },
  { timestamps: true },
);

export default mongoose.model('User', userSchema);
