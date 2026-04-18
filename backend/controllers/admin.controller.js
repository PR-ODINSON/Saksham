import User from '../models/user.model.js';
import School from '../models/School.js';
import ConditionReport from '../models/ConditionReport.js';
import WorkOrder from '../models/WorkOrder.js';

export const getAdminStats = async (_req, res) => {
  try {
    const [users, schools, reports, workOrders] = await Promise.all([
      User.countDocuments(),
      School.countDocuments(),
      ConditionReport.countDocuments(),
      WorkOrder.countDocuments(),
    ]);

    const criticalSchools = await School.countDocuments({ lastRiskCategory: 'critical' });
    const pendingOrders = await WorkOrder.countDocuments({ status: 'pending' });
    const completedOrders = await WorkOrder.countDocuments({ status: 'completed' });

    res.json({
      success: true,
      stats: { users, schools, reports, workOrders, criticalSchools, pendingOrders, completedOrders },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllUsers = async (_req, res) => {
  try {
    const users = await User.find().select('-password').populate('schoolId', 'name district');
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
