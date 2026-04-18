import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { registerUser, loginUser, logoutUser, getMe } from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/me', protect, getMe);

export default router;
