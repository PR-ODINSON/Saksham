import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { submitReport, getReports } from '../controllers/report.controller.js';
import upload from '../config/multer.js';

const router = express.Router();

router.post(
  '/',
  protect,
  authorize('school', 'deo', 'admin'),
  upload.array('images', 5),
  submitReport
);
router.get('/', protect, getReports);

export default router;
