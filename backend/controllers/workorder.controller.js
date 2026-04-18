import WorkOrder from '../models/WorkOrder.js';
import School from '../models/School.js';

// GET /api/work-orders
export const getWorkOrders = async (req, res) => {
  try {
    const { status, schoolId, assignedTo } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (schoolId) filter.schoolId = schoolId;

    // Contractors only see their assigned work
    if (req.user.role === 'contractor') {
      filter.assignedTo = req.user.id;
    } else if (assignedTo) {
      filter.assignedTo = assignedTo;
    }

    const orders = await WorkOrder.find(filter)
      .sort({ createdAt: -1 })
      .populate('schoolId', 'name district address')
      .populate('assignedTo', 'name phone')
      .populate('assignedBy', 'name');

    res.json({ success: true, workOrders: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/assign-task
export const assignTask = async (req, res) => {
  try {
    const {
      schoolId, reportId, category, subCategory,
      description, priority, estimatedDays, riskScore,
      assignedTo, dueDate,
    } = req.body;

    if (!schoolId || !category || !description) {
      return res.status(400).json({
        success: false,
        message: 'schoolId, category and description are required',
      });
    }

    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });

    const workOrder = await WorkOrder.create({
      schoolId,
      reportId,
      category,
      subCategory,
      description,
      priority: priority || 'medium',
      estimatedDays,
      riskScore: riskScore || 0,
      assignedTo: assignedTo || null,
      assignedBy: req.user.id,
      assignedAt: assignedTo ? new Date() : null,
      status: assignedTo ? 'assigned' : 'pending',
      dueDate: dueDate ? new Date(dueDate) : null,
    });

    await workOrder.populate('schoolId', 'name district');
    await workOrder.populate('assignedTo', 'name phone');

    res.status(201).json({ success: true, workOrder });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/complete-task
export const completeTask = async (req, res) => {
  try {
    const { workOrderId, completionNotes, completionImageUrl } = req.body;

    const workOrder = await WorkOrder.findById(workOrderId);
    if (!workOrder) {
      return res.status(404).json({ success: false, message: 'Work order not found' });
    }

    // Only assigned contractor or DEO/admin can complete
    const isContractor = req.user.role === 'contractor' &&
      workOrder.assignedTo?.toString() === req.user.id;
    const isDEOOrAdmin = ['deo', 'admin'].includes(req.user.role);

    if (!isContractor && !isDEOOrAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }

    workOrder.status = 'completed';
    workOrder.completedAt = new Date();
    workOrder.completionNotes = completionNotes;
    workOrder.completionImageUrl = completionImageUrl;
    workOrder.verifiedBy = isDEOOrAdmin ? req.user.id : null;
    await workOrder.save();

    res.json({ success: true, workOrder });
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
      { new: true }
    ).populate('schoolId', 'name district').populate('assignedTo', 'name');

    if (!workOrder) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, workOrder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
