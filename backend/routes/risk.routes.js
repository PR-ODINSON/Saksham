import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { getRiskScores, getRiskBySchool, getAllRisks, getMaintenanceQueue, getHeatmap, getRiskTimeline } from '../controllers/risk.controller.js';

const router = express.Router();

// Static routes MUST be registered before /:school_id to prevent shadowing.
// GET /api/risk/all
router.get('/all',     protect, authorize('deo', 'admin', 'contractor'), getAllRisks);

// GET /api/risk/queue
router.get('/queue',   protect, authorize('deo', 'admin'), getMaintenanceQueue);

// GET /api/risk/heatmap
router.get('/heatmap', protect, authorize('deo', 'admin'), getHeatmap);

// GET /api/risk-scores (root)
router.get('/', protect, authorize('deo', 'admin'), getRiskScores);

// GET /api/risk/:school_id/timeline
router.get('/:school_id/timeline', protect, getRiskTimeline);

// GET /api/risk/:school_id  (dynamic — must come last)
router.get('/:school_id', protect, getRiskBySchool);

export default router;
