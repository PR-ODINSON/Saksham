import express from 'express';
import { getAlerts, markAsRead, getAlertDigest } from '../controllers/alert.controller.js';

const router = express.Router();

router.get('/', getAlerts);
router.get('/digest', getAlertDigest);
router.patch('/:id/read', markAsRead);

export default router;
