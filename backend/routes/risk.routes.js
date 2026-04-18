import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import {
  getRiskScores,
  getSchoolRisk,
  getMaintenanceQueue,
  getRiskBySchool,
  getAllRisks,
} from '../controllers/risk.controller.js';

const router = express.Router();

// ── PS-03 Spec endpoints ──────────────────────────────────────────────────────
// NOTE: literal paths must come before /:param routes to avoid shadowing

// GET /api/risk/all — all stored per-category predictions
router.get('/all', protect, authorize('deo', 'admin', 'contractor'), getAllRisks);

// GET /api/risk/:school_id — predictions for a single school
router.get('/:school_id', protect, getRiskBySchool);

// ── Legacy endpoints (keep for existing dashboard) ────────────────────────────

// GET /api/risk-scores — composite scores for all schools
router.get('/', protect, authorize('deo', 'admin'), getRiskScores);

// GET /api/risk-scores/:schoolId — composite score for one school
// (handled by /:school_id above — both work)

export default router;
