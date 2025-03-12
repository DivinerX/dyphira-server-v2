import express from 'express';
import { addClick, getClicks } from '@/controllers/clicks';
import { auth } from '@/middleware/auth';
const router = express.Router();

// TODO: only fund can fetch a fund
router.get('/', auth, getClicks);
router.post('/', addClick);

export default router;
