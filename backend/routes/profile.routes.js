import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { getProfile, updateProfile, updatePassword } from '../controllers/profile.controller.js';

const router = express.Router();

router.use(protect);
router.get('/', getProfile);
router.put('/', updateProfile);
router.put('/password', updatePassword);

export default router;
