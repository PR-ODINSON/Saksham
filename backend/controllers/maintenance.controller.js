import { MaintenanceDecision, WorkOrder, RepairLog } from '../models/index.js';

// Maintenance Decisions
export const createDecision = async (req, res) => {
  try {
    const decision = await MaintenanceDecision.create(req.body);
    res.status(201).json({ success: true, data: decision });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Work Orders
export const createWorkOrder = async (req, res) => {
  try {
    const workOrder = await WorkOrder.create(req.body);
    res.status(201).json({ success: true, data: workOrder });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Repair Logs
export const createRepairLog = async (req, res) => {
  try {
    const log = await RepairLog.create(req.body);
    res.status(201).json({ success: true, data: log });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
