import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import {
  getAdminStats,
  getAllUsers,
  deleteUser,
  loadCSVData,
  getPriorityConfig,
  updatePriorityConfig,
  getAuditLogs,
} from '../controllers/admin.controller.js';

const router = express.Router();

router.use(protect, authorize('admin', 'deo'));

router.get('/stats',        authorize('admin'), getAdminStats);
router.get('/users',        authorize('admin'), getAllUsers);
router.delete('/users/:id', authorize('admin'), deleteUser);

// Trigger CSV pipeline: GET /api/admin/load-csv
router.get('/load-csv', authorize('admin'), loadCSVData);

// Priority config — DEO and admin can read; only admin can write
router.get('/priority-config', getPriorityConfig);
router.put('/priority-config', authorize('admin'), updatePriorityConfig);

// Audit logs
router.get('/audit-logs', authorize('admin'), getAuditLogs);

export default router;
