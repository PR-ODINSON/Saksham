import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import User from '../models/user.model.js';

const router = express.Router();

// GET /api/users/contractors — list all contractor accounts (deo + admin only)
router.get(
  '/contractors',
  protect,
  authorize('deo', 'admin'),
  async (_req, res) => {
    try {
      const contractors = await User.find({ role: 'contractor' }, 'name email phone').lean();
      res.json({ success: true, contractors });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
);

export default router;
