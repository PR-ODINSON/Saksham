import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import User from '../models/user.model.js';
import { SchoolConditionRecord, MaintenanceDecision, WorkOrder, Alert, DistrictAnalytics } from '../models/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const getAdminStats = async (_req, res) => {
  try {
    const [users, records, decisions, workOrders, alerts] = await Promise.all([
      User.countDocuments(),
      SchoolConditionRecord.countDocuments(),
      MaintenanceDecision.countDocuments(),
      WorkOrder.countDocuments(),
      Alert.countDocuments({ isResolved: false }),
    ]);

    const highPriority    = await MaintenanceDecision.countDocuments({ 'decision.priorityLevel': { $in: ['high', 'urgent'] } });
    const failWithin30    = await SchoolConditionRecord.countDocuments({ willFailWithin30Days: true });
    const slaBreaches     = await SchoolConditionRecord.countDocuments({ slaBreach: true });
    const districtCount   = await DistrictAnalytics.countDocuments();

    res.json({
      success: true,
      stats: {
        users, records, decisions, workOrders,
        unresolvedAlerts: alerts,
        highPriorityDecisions: highPriority,
        failuresWithin30Days: failWithin30,
        slaBreaches, districtCount,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllUsers = async (_req, res) => {
  try {
    const users = await User.find().select('-password');
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

/**
 * GET /api/admin/load-csv
 * Spawns the CSV pipeline script and responds immediately.
 */
export const loadCSVData = (_req, res) => {
  const scriptPath = path.resolve(__dirname, '../scripts/loadCSV.js');

  res.status(202).json({
    success: true,
    message: 'CSV pipeline started. Check server logs for progress (1–3 min).',
  });

  const child = exec(`node "${scriptPath}"`, { cwd: path.resolve(__dirname, '..') });
  child.stdout.on('data', d => process.stdout.write(d));
  child.stderr.on('data', d => process.stderr.write(d));
  child.on('close', code => console.log(`\n✓ CSV pipeline exited: ${code}`));
};
