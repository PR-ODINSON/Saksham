import { DistrictAnalytics } from '../models/index.js';

export const getDistrictStats = async (req, res) => {
  try {
    const stats = await DistrictAnalytics.findOne({ 
      districtName: req.query.district,
      period: req.query.period 
    });
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updateStats = async (req, res) => {
  try {
    const stats = await DistrictAnalytics.findOneAndUpdate(
      { districtName: req.body.districtName, period: req.body.period },
      req.body,
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
