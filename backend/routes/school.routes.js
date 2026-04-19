import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { getAllSchools, getSchoolById, getSchoolStats } from '../controllers/school.controller.js';

const router = express.Router();

router.get('/',    protect, getAllSchools);
router.get('/:id', protect, getSchoolById);
router.get('/:id/stats', protect, getSchoolStats);

export default router;
