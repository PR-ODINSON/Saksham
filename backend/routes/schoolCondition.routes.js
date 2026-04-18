import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import {
  createRecord,
  getRecords,
} from '../controllers/schoolCondition.controller.js';

const router = express.Router();

// Any authenticated user may read condition records
router.get('/', protect, getRecords);
// Only authorised roles may write condition records
router.post('/', protect, authorize('deo', 'admin', 'peon', 'principal'), createRecord);

export default router;
