import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { getRiskScores, getRiskBySchool, getAllRisks, getMaintenanceQueue } from '../controllers/risk.controller.js';

const router = express.Router();

// GET /api/risk/all  — must be before /:school_id to avoid shadowing
router.get('/all', protect, authorize('deo', 'admin', 'contractor'), getAllRisks);

// GET /api/risk/:school_id
router.get('/:school_id', protect, getRiskBySchool);

// GET /api/risk/queue
router.get('/queue', protect, authorize('deo', 'admin'), getMaintenanceQueue);

// GET /api/risk-scores
router.get('/', protect, authorize('deo', 'admin'), getRiskScores);

export default router;
