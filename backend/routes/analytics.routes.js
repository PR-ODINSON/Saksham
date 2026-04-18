import express from 'express';
import {
  getDistrictStats,
  updateStats,
  getModelAccuracy,
  recomputeAnalytics,
} from '../controllers/analytics.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', getDistrictStats);
router.post('/update', updateStats);

// POST /api/analytics/recompute — rebuild district_analytics from scratch.
// Open to DEO + admin so it can be triggered from the dashboard.
router.post('/recompute', protect, authorize('deo', 'admin'), recomputeAnalytics);

// GET /api/analytics/model-accuracy
// Aggregates prediction errors from completed repair logs per category and district.
router.get('/model-accuracy', protect, authorize('deo', 'admin'), getModelAccuracy);

export default router;
