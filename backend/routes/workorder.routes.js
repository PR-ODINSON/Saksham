import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import {
  getWorkOrders,
  assignTask,
  completeTask,
  updateTaskStatus,
} from '../controllers/workorder.controller.js';

const router = express.Router();

router.get('/', protect, getWorkOrders);
router.post('/assign', protect, authorize('deo', 'admin'), assignTask);
router.post('/complete', protect, completeTask);
router.patch('/:id/status', protect, authorize('deo', 'admin'), updateTaskStatus);

export default router;
