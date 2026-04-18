import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { submitReport, getReports, getReportsBySchool, reviewReport, forwardReport } from '../controllers/report.controller.js';
import { generateAndSendPDF } from '../services/reportGenerator.js';
import { writeAuditLog } from '../utils/auditLogger.js';
import upload from '../config/multer.js';

const router = express.Router();

// POST /api/reports  — submit a weekly condition report (structured input only)
router.post(
  '/',
  protect,
  authorize('peon', 'principal', 'deo', 'admin'),
  upload.array('images', 5),
  submitReport,
);

// GET /api/reports  — list reports (filtered by query ?schoolId=xxx)
router.get('/', protect, getReports);

// GET /api/reports/:school_id  — reports for a specific school (PS-03 spec)
// NOTE: static routes /review, /forward, /pdf are matched before /:school_id
router.patch('/:id/review', protect, authorize('principal', 'deo', 'admin'), reviewReport);
router.post('/:id/forward', protect, authorize('principal', 'deo', 'admin'), forwardReport);

// GET /api/reports/:id/pdf  — download PDF report
router.get('/:id/pdf', protect, authorize('principal', 'deo', 'admin'), async (req, res) => {
  try {
    const filePath = await generateAndSendPDF(req.params.id);
    writeAuditLog(req, 'report_downloaded', 'SchoolConditionRecord', req.params.id, {});
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:school_id', protect, getReportsBySchool);

export default router;
