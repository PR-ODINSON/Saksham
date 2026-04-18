import mongoose from 'mongoose';

const schoolConditionRecordSchema = new mongoose.Schema({
  // School Info
  schoolId: {
    type: Number,
    required: [true, 'School ID is required']
  },
  district: {
    type: String,
    required: [true, 'District is required'],
    index: true
  },
  block: {
    type: String
  },
  schoolType: {
    type: String,
    enum: ['Primary', 'Secondary']
  },
  isGirlsSchool: {
    type: Boolean
  },
  numStudents: {
    type: Number
  },

  // Infrastructure
  buildingAge: {
    type: Number
  },
  materialType: {
    type: String,
    enum: ['RCC', 'Brick', 'Mixed', 'Temporary']
  },
  weatherZone: {
    type: String,
    enum: ['Dry', 'Heavy Rain', 'Coastal', 'Tribal']
  },

  // Time
  category: {
    type: String,
    enum: ['plumbing', 'electrical', 'structural']
  },
  weekNumber: {
    type: Number
  },

  // Condition
  conditionScore: {
    type: Number,
    min: 1,
    max: 5
  },

  // Issues
  issueFlag: {
    type: Boolean
  },
  waterLeak: {
    type: Boolean
  },
  wiringExposed: {
    type: Boolean
  },
  crackWidthMM: {
    type: Number
  },
  toiletFunctionalRatio: {
    type: Number
  },
  powerOutageHours: {
    type: Number
  },
  roofLeakFlag: {
    type: Boolean
  },

  // Field
  photoUploaded: {
    type: Boolean
  },

  // Prediction
  daysToFailure: {
    type: Number
  },
  willFailWithin30Days: {
    type: Boolean
  },
  willFailWithin60Days: {
    type: Boolean
  },

  // Priority
  priorityScore: {
    type: Number
  },

  // Repair
  repairDone: {
    type: Boolean
  },
  daysSinceRepair: {
    type: Number
  },

  // Contractor
  contractorDelayDays: {
    type: Number
  },
  slaBreach: {
    type: Boolean
  }
}, {
  timestamps: true,
  collection: 'school_condition_records'
});

// Compound index: { schoolId, category, weekNumber } unique
schoolConditionRecordSchema.index({ schoolId: 1, category: 1, weekNumber: 1 }, { unique: true });

const SchoolConditionRecord = mongoose.model('SchoolConditionRecord', schoolConditionRecordSchema);

export default SchoolConditionRecord;

