import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import User from '../models/user.model.js';
import School from '../models/School.js';
import ConditionReport from '../models/ConditionReport.js';
import WorkOrder from '../models/WorkOrder.js';
import RiskPrediction from '../models/RiskPrediction.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const getAdminStats = async (_req, res) => {
  try {
    const [users, schools, reports, workOrders, predictions] = await Promise.all([
      User.countDocuments(),
      School.countDocuments(),
      ConditionReport.countDocuments(),
      WorkOrder.countDocuments(),
      RiskPrediction.countDocuments(),
    ]);

    const criticalSchools  = await School.countDocuments({ lastRiskCategory: { $in: ['critical', 'high'] } });
    const pendingOrders    = await WorkOrder.countDocuments({ status: 'pending' });
    const completedOrders  = await WorkOrder.countDocuments({ status: 'completed' });
    const highRiskPreds    = await RiskPrediction.countDocuments({ riskLevel: 'high' });

    res.json({
      success: true,
      stats: {
        users, schools, reports, workOrders, predictions,
        criticalSchools, pendingOrders, completedOrders, highRiskPreds,
      },
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

/**
 * GET /api/admin/load-csv
 * Spawns the CSV pipeline script as a child process and streams status.
 * Responds immediately with 202 Accepted and logs output to server console.
 */
export const loadCSVData = (req, res) => {
  const scriptPath = path.resolve(__dirname, '../scripts/loadCSV.js');

  res.status(202).json({
    success: true,
    message: 'CSV pipeline started. Check server logs for progress. This may take 1–3 minutes.',
    script: scriptPath,
  });

  // Run the pipeline as a detached child process so it doesn't block the server
  const child = exec(`node "${scriptPath}"`, { cwd: path.resolve(__dirname, '..') });

  child.stdout.on('data', data => process.stdout.write(data));
  child.stderr.on('data', data => process.stderr.write(data));
  child.on('close', code => {
    console.log(`\n✓ CSV pipeline exited with code ${code}`);
  });
};
