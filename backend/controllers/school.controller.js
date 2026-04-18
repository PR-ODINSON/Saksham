/**
 * School controller — PS-03
 * No standalone School collection anymore.
 * School info is embedded in SchoolConditionRecord.
 * These endpoints aggregate distinct school profiles from those records.
 */
import { SchoolConditionRecord } from '../models/index.js';

// GET /api/schools
export const getAllSchools = async (req, res) => {
  try {
    const { district } = req.query;
    const match = district ? { district } : {};

    const schools = await SchoolConditionRecord.aggregate([
      { $match: match },
      { $sort: { weekNumber: -1 } },
      {
        $group: {
          _id: '$schoolId',
          schoolId:     { $first: '$schoolId' },
          district:     { $first: '$district' },
          block:        { $first: '$block' },
          schoolType:   { $first: '$schoolType' },
          isGirlsSchool:{ $first: '$isGirlsSchool' },
          numStudents:  { $first: '$numStudents' },
          buildingAge:  { $first: '$buildingAge' },
          materialType: { $first: '$materialType' },
          weatherZone:  { $first: '$weatherZone' },
          maxPriorityScore: { $max: '$priorityScore' },
          latestWeek:   { $max: '$weekNumber' },
        },
      },
      {
        $lookup: {
          from: 'schools',
          localField: 'schoolId',
          foreignField: 'schoolId',
          as: 'schoolData'
        }
      },
      {
        $unwind: {
          path: '$schoolData',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          name: { $ifNull: ['$schoolData.name', { $concat: ['School ', { $toString: '$schoolId' }] }] },
          location: { $ifNull: ['$schoolData.location', { lat: 23.8, lng: 69.5 }] }
        }
      },
      {
        $project: {
          schoolData: 0
        }
      },
      { $sort: { maxPriorityScore: -1 } },
    ]);

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

    const records = await SchoolConditionRecord.find({ schoolId })
      .sort({ weekNumber: -1 })
      .lean();

    if (!records.length) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    const profile = {
      schoolId:     records[0].schoolId,
      district:     records[0].district,
      block:        records[0].block,
      schoolType:   records[0].schoolType,
      isGirlsSchool:records[0].isGirlsSchool,
      numStudents:  records[0].numStudents,
      buildingAge:  records[0].buildingAge,
      materialType: records[0].materialType,
      weatherZone:  records[0].weatherZone,
      totalRecords: records.length,
    };

    res.json({ success: true, school: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
