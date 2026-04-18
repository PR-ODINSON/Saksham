/**
 * Work Order controller — PS-03
 * Uses the new WorkOrder schema: decisionId, schoolId (Number), deadline, status.
 */
import { WorkOrder, MaintenanceDecision, RepairLog, SchoolConditionRecord } from '../models/index.js';

// GET /api/tasks  |  GET /api/work-orders
export const getWorkOrders = async (req, res) => {
  try {
    const { status, schoolId, district } = req.query;
    const filter = {};
    if (status)   filter.status   = status;
    if (schoolId) filter.schoolId = Number(schoolId);
    if (district) filter.district = district;

    // Contractors see only their own work
    if (req.user?.role === 'contractor') {
      filter['assignment.assignedTo'] = req.user.id;
    }

    const orders = await WorkOrder.find(filter)
      .sort({ createdAt: -1 })
      .populate('assignment.assignedTo', 'name phone')
      .populate('assignment.assignedBy', 'name')
      .lean();

    res.json({ success: true, workOrders: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/tasks/assign  |  POST /api/work-orders/assign
export const assignTask = async (req, res) => {
  try {
    const { decisionId, schoolId, district, category, assignedTo, priorityScore, deadline } = req.body;

    if (!schoolId || !category || !deadline) {
      return res.status(400).json({
        success: false,
        message: 'Required: schoolId, category, deadline',
      });
    }

    // Resolve decisionId if not provided — use latest pending decision for school+category
    let resolvedDecisionId = decisionId;
    if (!resolvedDecisionId) {
      const decision = await MaintenanceDecision.findOne({
        schoolId: Number(schoolId),
        category,
        status: 'pending',
      }).sort({ 'decision.computedPriorityScore': -1 });
      if (decision) {
        resolvedDecisionId = decision._id;
        // Update decision status to 'assigned'
        decision.status = 'assigned';
        await decision.save();
      }
    }

    const workOrder = await WorkOrder.create({
      decisionId:    resolvedDecisionId || undefined,
      schoolId:      Number(schoolId),
      district:      district || '',
      category,
      assignment: {
        assignedTo: assignedTo || undefined,
        assignedBy: req.user?.id || undefined,
      },
      priorityScore: Number(priorityScore) || 0,
      status:   'assigned',
      deadline: new Date(deadline),
    });

    res.status(201).json({ success: true, workOrder });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/tasks/complete  |  POST /api/work-orders/complete
// PS-03 learning rule: create a RepairLog recording before/after state
export const completeTask = async (req, res) => {
  try {
    const { workOrderId, afterConditionScore, notes } = req.body;

    const workOrder = await WorkOrder.findById(workOrderId);
    if (!workOrder) {
      return res.status(404).json({ success: false, message: 'Work order not found' });
    }

    const isContractor = req.user?.role === 'contractor' &&
      workOrder.assignment?.assignedTo?.toString() === req.user.id;
    const isAuthorised = isContractor || ['deo', 'admin'].includes(req.user?.role);
    if (!isAuthorised) {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }

    workOrder.status = 'completed';
    await workOrder.save();

    // Fetch before-state from latest SchoolConditionRecord
    const beforeRecord = await SchoolConditionRecord.findOne({
      schoolId: workOrder.schoolId,
      category: workOrder.category,
    }).sort({ weekNumber: -1 });

    // Create repair log (PS-03 history)
    const completionTimeDays = Math.round(
      (Date.now() - workOrder.createdAt.getTime()) / 86400000,
    );

    const repairLog = await RepairLog.create({
      workOrderId:    workOrder._id,
      schoolId:       workOrder.schoolId,
      category:       workOrder.category,
      before: {
        conditionScore: beforeRecord?.conditionScore ?? 5,
        issues: {
          waterLeak:    beforeRecord?.waterLeak,
          wiringExposed: beforeRecord?.wiringExposed,
          roofLeakFlag: beforeRecord?.roofLeakFlag,
          notes,
        },
      },
      after: {
        conditionScore: Number(afterConditionScore) || 2,
      },
      completionTimeDays,
      contractorDelayDays: 0,
      slaBreached: false,
    });

    // Update decision status to 'completed'
    if (workOrder.decisionId) {
      await MaintenanceDecision.findByIdAndUpdate(
        workOrder.decisionId,
        { status: 'completed' },
      );
    }

    res.json({ success: true, workOrder, repairLog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/work-orders/:id/status
export const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const workOrder = await WorkOrder.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );
    if (!workOrder) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, workOrder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
