import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { getAdminStats, getAllUsers, deleteUser, loadCSVData } from '../controllers/admin.controller.js';

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/stats',        getAdminStats);
router.get('/users',        getAllUsers);
router.delete('/users/:id', deleteUser);

// Trigger CSV pipeline: GET /api/admin/load-csv
router.get('/load-csv', loadCSVData);

export default router;
