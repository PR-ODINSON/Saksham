import express from 'express';
import { getDistrictStats, updateStats } from '../controllers/analytics.controller.js';

const router = express.Router();

router.get('/', getDistrictStats);
router.post('/update', updateStats);

export default router;
