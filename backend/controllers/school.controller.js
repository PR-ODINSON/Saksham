/**
 * School controller — PS-03
 * No standalone School collection anymore.
 * School info is embedded in SchoolConditionRecord.
 * These endpoints aggregate distinct school profiles from those records.
 */
import { SchoolConditionRecord, School } from '../models/index.js';

// GET /api/schools
export const getAllSchools = async (req, res) => {
  try {
    const { district } = req.query;
    const match = district ? { district } : {};

    const schools = await School.find(match).lean();

    res.json({ success: true, schools, total: schools.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/schools/:id  (numeric school_id)
export const getSchoolById = async (req, res) => {
  try {
    const schoolId = Number(req.params.id);
    if (isNaN(schoolId)) {
      return res.status(400).json({ success: false, message: 'id must be a number' });
    }

    const school = await School.findOne({ schoolId }).lean();
    
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    const totalRecords = await SchoolConditionRecord.countDocuments({ schoolId });

    const profile = {
      ...school,
      totalRecords,
    };

    res.json({ success: true, school: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
