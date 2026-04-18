import mongoose from 'mongoose';

/**
 * User Schema
 * Handles authentication and role-based access for Saksham.
 */
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  phone: {
    type: String
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    select: false // Don't return password by default
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: [
      "SCHOOL_STAFF",
      "PRINCIPAL",
      "DEO",
      "CONTRACTOR",
      "ADMIN"
    ],
    default: "SCHOOL_STAFF"
  },

  // Association fields - REFACTORED: now with role-based validation
  schoolId: {
    type: Number, // for staff & principal
    index: true,
    required: [
      function() {
        return ['SCHOOL_STAFF', 'PRINCIPAL'].includes(this.role);
      },
      'School ID is required for staff and principal roles'
    ]
  },
  district: {
    type: String, // for DEO
    index: true,
    required: [
      function() {
        return this.role === 'DEO';
      },
      'District is required for DEO role'
    ]
  },

  contractorDetails: {
    companyName: String,
    serviceAreas: [String]
  },

  isActive: {
    type: Boolean,
    default: true
  },

  lastLogin: {
    type: Date
  }
}, {
  timestamps: true, // Automatically handles createdAt and updatedAt
  collection: 'users'
});

const User = mongoose.model('User', userSchema);

export default User;