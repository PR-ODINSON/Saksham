import express from 'express';
import { 
  createDecision, 
  createWorkOrder, 
  createRepairLog 
} from '../controllers/maintenance.controller.js';

const router = express.Router();

router.post('/decisions', createDecision);
router.post('/work-orders', createWorkOrder);
router.post('/repair-logs', createRepairLog);

export default router;
