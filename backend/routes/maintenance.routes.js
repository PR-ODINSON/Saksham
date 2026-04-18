import express from 'express';
import { 
  createDecision, 
  getDecisions,
  updateDecisionStatus,
  createWorkOrder, 
  createRepairLog 
} from '../controllers/maintenance.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/decisions', protect, getDecisions);
router.post('/decisions', protect, createDecision);
router.patch('/decisions/:id', protect, authorize('admin', 'deo', 'principal'), updateDecisionStatus);
router.post('/work-orders', protect, createWorkOrder);
router.post('/repair-logs', protect, createRepairLog);

export default router;
