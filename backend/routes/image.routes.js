import express from 'express';
import { getImage } from '../controllers/image.controller.js';

const router = express.Router();

// Public-by-id image streaming from MongoDB.
router.get('/:id', getImage);

export default router;
