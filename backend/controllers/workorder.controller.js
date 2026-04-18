import WorkOrder from '../models/WorkOrder.js';
import School from '../models/School.js';
import RiskPrediction from '../models/RiskPrediction.js';

// GET /api/work-orders  (alias: GET /api/tasks)
export const getWorkOrders = async (req, res) => {
  try {
    const { status, schoolId, assignedTo } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (schoolId) filter.schoolId = schoolId;

    // Contractors only see their own assigned work
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

// POST /api/work-orders/assign  (alias: POST /api/tasks/assign)
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

// POST /api/work-orders/complete  (alias: POST /api/tasks/complete)
// After completion: reduce stored risk_score by 30 (min 0) — PS-03 learning rule
export const completeTask = async (req, res) => {
  try {
    const { workOrderId, completionNotes } = req.body;

    // Support file upload via multer (req.file) or plain URL in body
    const completionImageUrl = req.file
      ? `/uploads/${req.file.filename}`
      : req.body.completionImageUrl;

    const workOrder = await WorkOrder.findById(workOrderId);
    if (!workOrder) {
      return res.status(404).json({ success: false, message: 'Work order not found' });
    }

    const isContractor = req.user.role === 'contractor' &&
      workOrder.assignedTo?.toString() === req.user.id;
    const isDEOOrAdmin  = ['deo', 'admin'].includes(req.user.role);

    if (!isContractor && !isDEOOrAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }

    workOrder.status             = 'completed';
    workOrder.completedAt        = new Date();
    workOrder.completionNotes    = completionNotes;
    workOrder.completionImageUrl = completionImageUrl;
    workOrder.verifiedBy         = isDEOOrAdmin ? req.user.id : null;
    await workOrder.save();

    // ── PS-03 Learning Rule: repair completed → reduce risk score by 30 ──
    if (workOrder.category && PS03_CATEGORIES.includes(workOrder.category)) {
      await _reduceRiskAfterRepair(workOrder.schoolId, workOrder.category);
    }

    res.json({ success: true, workOrder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Reduce the stored risk_score by 30 (min 0) after a repair is completed.
 * Also updates the cached school lastRiskScore.
 */
async function _reduceRiskAfterRepair(schoolId, category) {
  try {
    const prediction = await RiskPrediction.findOne({ schoolId, category });
    if (!prediction) return;

    const newScore = Math.max(0, prediction.riskScore - 30);
    prediction.riskScore = newScore;
    prediction.reason    = `${prediction.reason} [repair completed — score reduced]`;
    // Recalculate failure window based on new score
    if (newScore > 66) prediction.failureWindow = 30;
    else if (newScore > 33) prediction.failureWindow = 45;
    else prediction.failureWindow = 60;
    await prediction.save();

    // Update cached school score
    const allPreds = await RiskPrediction.find({ schoolId }).lean();
    if (allPreds.length > 0) {
      const maxScore = Math.max(...allPreds.map(p => p.riskScore));
      const maxLevel = maxScore > 66 ? 'high' : maxScore > 33 ? 'medium' : 'low';
      await School.findByIdAndUpdate(schoolId, {
        lastRiskScore: maxScore,
        lastRiskCategory: maxLevel,
        lastAssessedAt: new Date(),
      });
    }
  } catch {
    // Non-critical — don't fail the whole request
  }
}

const PS03_CATEGORIES = ['plumbing', 'electrical', 'structural'];

// PATCH /api/work-orders/:id/status
export const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const workOrder = await WorkOrder.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    )
      .populate('schoolId', 'name district')
      .populate('assignedTo', 'name');

    if (!workOrder) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, workOrder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
