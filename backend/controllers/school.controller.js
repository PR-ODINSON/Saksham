import School from '../models/School.js';
import User from '../models/user.model.js';

export const getAllSchools = async (req, res) => {
  try {
    const { district } = req.query;
    const filter = district ? { district } : {};
    const schools = await School.find(filter).sort({ lastRiskScore: -1 });
    res.json({ success: true, schools });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSchoolById = async (req, res) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });
    res.json({ success: true, school });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createSchool = async (req, res) => {
  try {
    const school = await School.create(req.body);
    res.status(201).json({ success: true, school });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getMySchool = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('schoolId');
    if (!user?.schoolId) {
      return res.status(404).json({ success: false, message: 'No school linked to this account' });
    }
    res.json({ success: true, school: user.schoolId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
