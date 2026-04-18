import { Alert } from '../models/index.js';

export const getAlerts = async (req, res) => {
  try {
    const { district, type } = req.query;
    const filter = { isResolved: false }; // fixed: was isRead (field doesn't exist)
    if (district) filter.district = district;
    if (type)     filter.type     = type;

    const alerts = await Alert.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: alerts });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    // fixed: update isResolved instead of isRead
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isResolved: true },
      { new: true },
    );
    res.status(200).json({ success: true, data: alert });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
