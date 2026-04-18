import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import {
  getAllSchools,
  getSchoolById,
  createSchool,
  getMySchool,
} from '../controllers/school.controller.js';

const router = express.Router();

router.get('/', protect, getAllSchools);
router.get('/mine', protect, getMySchool);
router.get('/:id', protect, getSchoolById);
router.post('/', protect, authorize('admin', 'deo'), createSchool);

export default router;
