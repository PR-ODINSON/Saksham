import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import {
  getRiskScores,
  getSchoolRisk,
  getMaintenanceQueue,
} from '../controllers/risk.controller.js';

const router = express.Router();

// DEO + admin: aggregate risk scores across all schools
router.get('/', protect, authorize('deo', 'admin'), getRiskScores);
// Per-school risk (school can see own, DEO sees any)
router.get('/:schoolId', protect, getSchoolRisk);
// Prioritised maintenance queue
router.get('/queue/maintenance', protect, authorize('deo', 'admin', 'contractor'), getMaintenanceQueue);

export default router;
