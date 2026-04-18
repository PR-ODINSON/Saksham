import { DistrictAnalytics } from '../models/index.js';

export const getDistrictStats = async (req, res) => {
  try {
    const { district } = req.query; // fixed: was 'districtName'

    const filter = {};
    if (district) filter.district = district;

    const stats = await DistrictAnalytics.find(filter)
      .sort({ highPriorityCount: -1 })
      .lean();

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updateStats = async (req, res) => {
  try {
    const { district, ...rest } = req.body; // fixed: was 'districtName'

    if (!district) {
      return res.status(400).json({ success: false, error: 'district is required' });
    }

    const stats = await DistrictAnalytics.findOneAndUpdate(
      { district },
      { district, ...rest, generatedAt: new Date() },
      { upsert: true, new: true },
    );
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
