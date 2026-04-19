import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import {
  getWorkOrders,
  assignTask,
  completeTask,
  updateTaskStatus,
  getWorkOrderDetails,
  getRepairLogByTask,
} from '../controllers/workorder.controller.js';
import upload from '../config/multer.js';

const router = express.Router();

router.get('/', protect, getWorkOrders);
router.post('/assign', protect, authorize('deo', 'admin'), assignTask);
router.post('/complete', protect, upload.single('photo'), completeTask);
router.patch('/:id/status', protect, authorize('deo', 'admin'), updateTaskStatus);
router.get('/:id/details', protect, getWorkOrderDetails);
router.get('/:id/feedback', protect, getRepairLogByTask);

export default router;
