/**
 * PS-03 Spec task (work order) routes.
 * Mounted at /api/tasks in server.js.
 */
import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { getWorkOrders, assignTask, completeTask, updateTaskStatus, respondToTask, getWorkOrderDetails, getRepairLogByTask } from '../controllers/workorder.controller.js';
import upload from '../config/multer.js';

const router = express.Router();

// GET /api/tasks — list all tasks / work orders
router.get('/', protect, getWorkOrders);

// POST /api/tasks/assign — assign a work order to a contractor
router.post('/assign', protect, authorize('deo', 'bmo', 'admin'), assignTask);

// POST /api/tasks/complete — mark task complete, upload photo proof.
// Accepts the canonical multipart field 'photo' from the contractor
// CompletionModal and the legacy field 'completionImage', normalising
// whichever was sent into req.file so the controller stays agnostic.
router.post(
  '/complete',
  protect,
  (req, res, next) => {
    upload.fields([
      { name: 'photo',           maxCount: 1 },
      { name: 'completionImage', maxCount: 1 },
    ])(req, res, (err) => {
      if (err) return next(err);
      if (req.files?.photo?.[0])                req.file = req.files.photo[0];
      else if (req.files?.completionImage?.[0]) req.file = req.files.completionImage[0];
      next();
    });
  },
  completeTask,
);

// PATCH /api/tasks/:id/status — update status
router.patch('/:id/status', protect, authorize('deo', 'bmo', 'admin'), updateTaskStatus);

// PATCH /api/tasks/:id/respond — contractor accepts or rejects a task
router.patch('/:id/respond', protect, authorize('contractor', 'deo', 'admin'), respondToTask);

// GET /api/tasks/:id/details — full work-order context: school, condition record,
// LR analysis, peon-uploaded photos and a human-readable issues list.
router.get('/:id/details', protect, getWorkOrderDetails);

// GET /api/tasks/:id/feedback — retrieve feedback for a task
router.get('/:id/feedback', protect, getRepairLogByTask);

export default router;
