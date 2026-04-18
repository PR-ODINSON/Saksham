import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { submitReport, getReports, getReportsBySchool } from '../controllers/report.controller.js';
import upload from '../config/multer.js';

const router = express.Router();

// POST /api/reports  — submit a weekly condition report (structured input only)
router.post(
  '/',
  protect,
  authorize('school', 'deo', 'admin'),
  upload.array('images', 5),
  submitReport,
);

// GET /api/reports  — list reports (filtered by query ?schoolId=xxx)
router.get('/', protect, getReports);

// GET /api/reports/:school_id  — reports for a specific school (PS-03 spec)
router.get('/:school_id', protect, getReportsBySchool);

export default router;
