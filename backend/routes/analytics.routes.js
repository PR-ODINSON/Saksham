import express from 'express';
import { getDistrictStats, updateStats, getModelAccuracy } from '../controllers/analytics.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', getDistrictStats);
router.post('/update', updateStats);

// GET /api/analytics/model-accuracy
// Aggregates prediction errors from completed repair logs per category and district.
router.get('/model-accuracy', protect, authorize('deo', 'admin'), getModelAccuracy);

export default router;
