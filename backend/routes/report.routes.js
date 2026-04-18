import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { submitReport, submitWeeklyReport, getReports, getReportsBySchool, reviewReport, forwardReport, getReportsStats, getWeeklyBundles, forwardWeeklyReport } from '../controllers/report.controller.js';
import { generateAndSendPDF } from '../services/reportGenerator.js';
import { writeAuditLog } from '../utils/auditLogger.js';
import upload from '../config/multer.js';

const router = express.Router();

// POST /api/reports  — submit a single category report (legacy, kept for compat)
router.post(
  '/',
  protect,
  authorize('peon', 'principal', 'deo', 'admin'),
  upload.array('images', 5),
  submitReport,
);

// POST /api/reports/weekly  — bundled submission: all 3 categories + 3 photos
// Photos are MANDATORY for peon submissions (enforced in controller).
router.post(
  '/weekly',
  protect,
  authorize('peon', 'principal', 'deo', 'admin'),
  upload.fields([
    { name: 'image_plumbing',   maxCount: 1 },
    { name: 'image_electrical', maxCount: 1 },
    { name: 'image_structural', maxCount: 1 },
  ]),
  submitWeeklyReport,
);

// GET /api/reports/stats — report presence per week
router.get('/stats', protect, getReportsStats);

// GET /api/reports/weekly/bundles?schoolId= — principal view: all weeks bundled
router.get(
  '/weekly/bundles',
  protect,
  authorize('peon', 'principal', 'deo', 'admin'),
  getWeeklyBundles,
);

// POST /api/reports/weekly/:schoolId/:weekNumber/forward — bundled forward
router.post(
  '/weekly/:schoolId/:weekNumber/forward',
  protect,
  authorize('principal', 'admin'),
  forwardWeeklyReport,
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
