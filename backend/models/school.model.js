import mongoose from 'mongoose';

/**
 * School Model
 * ADDED: Support for static school metadata and infrastructure details.
 * Stores information about buildings, weather zones, and student demographics.
 */
const schoolSchema = new mongoose.Schema({
  schoolId: {
    type: Number,
    required: [true, 'School ID is required'],
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'School name is required']
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
    enum: {
      values: ['Primary', 'Secondary'],
      message: '{VALUE} is not a valid school type'
    }
  },
  isGirlsSchool: {
    type: Boolean
  },
  numStudents: {
    type: Number
  },
  infrastructure: {
    buildingAge: {
      type: Number
    },
    materialType: {
      type: String,
      enum: {
        values: ['RCC', 'Brick', 'Mixed', 'Temporary'],
        message: '{VALUE} is not a valid material type'
      }
    },
    weatherZone: {
      type: String,
      enum: {
        values: ['Dry', 'Heavy Rain', 'Coastal', 'Tribal'],
        message: '{VALUE} is not a valid weather zone'
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'schools'
});

// Indexes
// Unique index on schoolId is already handled in field definition
// Index on district is already handled
// Compound index (district, block)
schoolSchema.index({ district: 1, block: 1 });

const School = mongoose.model('School', schoolSchema);

export default School;
