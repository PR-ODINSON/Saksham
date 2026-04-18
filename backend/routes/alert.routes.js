import express from 'express';
import { getAlerts, markAsRead } from '../controllers/alert.controller.js';

const router = express.Router();

router.get('/', getAlerts);
router.patch('/:id/read', markAsRead);

export default router;
