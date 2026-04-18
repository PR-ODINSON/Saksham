import mongoose from 'mongoose';

/**
 * Alert Schema
 * System-generated alerts for school infrastructure failures and high-priority issues.
 */
const alertSchema = new mongoose.Schema({
  schoolId: {
    type: Number,
    required: [true, 'School ID is required'],
    index: true
  },
  district: {
    type: String,
    required: [true, 'District is required']
  },
  category: {
    type: String,
    required: [true, 'Category (e.g., electrical, plumbing) is required']
  },
  type: {
    type: String,
    enum: {
      values: ['FAILURE_30_DAYS', 'FAILURE_60_DAYS', 'HIGH_PRIORITY', 'GPS_MISMATCH'],
      message: '{VALUE} is not a valid alert type'
    },
    required: [true, 'Alert type is required']
  },
  message: {
    type: String,
    required: [true, 'Alert message is required']
  },
  isResolved: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,
  collection: 'alerts'
});

alertSchema.index({ district: 1, type: 1, resolved: 1 });

const Alert = mongoose.model('Alert', alertSchema);

export default Alert;
