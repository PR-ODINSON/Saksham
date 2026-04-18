import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import {
  getWorkOrders,
  assignTask,
  completeTask,
  updateTaskStatus,
  getWorkOrderDetails,
} from '../controllers/workorder.controller.js';

const router = express.Router();

router.get('/', protect, getWorkOrders);
router.post('/assign', protect, authorize('deo', 'admin'), assignTask);
router.post('/complete', protect, completeTask);
router.patch('/:id/status', protect, authorize('deo', 'admin'), updateTaskStatus);
router.get('/:id/details', protect, getWorkOrderDetails);

export default router;
