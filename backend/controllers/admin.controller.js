import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import User from '../models/user.model.js';
import { SchoolConditionRecord, MaintenanceDecision, WorkOrder, Alert, DistrictAnalytics, PriorityConfig, AuditLog } from '../models/index.js';
import { invalidateConfigCache } from '../services/predictionEngine.js';

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

// ─── Priority Config endpoints ────────────────────────────────────────────────

/**
 * GET /api/admin/priority-config
 * Return the currently active PriorityConfig document.
 */
export const getPriorityConfig = async (_req, res) => {
  try {
    const config = await PriorityConfig.findOne({ isActive: true }).lean();
    if (!config) {
      return res.status(404).json({ success: false, message: 'No active config found' });
    }
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/admin/priority-config
 * Create or replace the active PriorityConfig.
 * Invalidates the engine's in-memory cache so the next prediction picks up the new values.
 *
 * Body: { version, conditionWeights?, multipliers?, maxPriorityScore? }
 */
export const updatePriorityConfig = async (req, res) => {
  try {
    const { version, conditionWeights, multipliers, maxPriorityScore } = req.body;

    if (!version) {
      return res.status(400).json({ success: false, message: 'version is required' });
    }

    // Deactivate any existing active config
    await PriorityConfig.updateMany({ isActive: true }, { $set: { isActive: false } });

    const config = await PriorityConfig.create({
      version,
      conditionWeights: conditionWeights ?? undefined,
      multipliers:      multipliers      ?? undefined,
      maxPriorityScore: maxPriorityScore ?? undefined,
      isActive: true,
      updatedBy: req.user?._id,
    });

    // Flush the prediction engine cache so it reads the new config
    invalidateConfigCache();

    res.status(201).json({
      success: true,
      message: `PriorityConfig v${version} activated. Engine cache cleared.`,
      config,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/admin/audit-logs
 * Paginated audit log with optional filters.
 */
export const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1, limit = 50,
      role, action, startDate, endDate,
    } = req.query;

    const match = {};
    if (role)      match.actorRole = role;
    if (action)    match.action    = { $regex: action, $options: 'i' };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate)   match.createdAt.$lte = new Date(endDate);
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await AuditLog.countDocuments(match);

    const logs = await AuditLog.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: Number(limit) },
      {
        $lookup: {
          from:         'users',
          localField:   'actorId',
          foreignField: '_id',
          as:           'actor',
        },
      },
      { $unwind: { path: '$actor', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id:             1,
          action:          1,
          actorRole:       1,
          targetCollection:1,
          targetId:        1,
          metadata:        1,
          ip:              1,
          createdAt:       1,
          actorName:       { $ifNull: ['$actor.name', 'System'] },
        },
      },
    ]);

    res.json({
      success: true,
      logs,
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
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
