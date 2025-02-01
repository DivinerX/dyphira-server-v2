import express from 'express';
import { getClicks } from '@/controllers/clicks';
import { auth } from '@/middleware/auth';
const router = express.Router();

// TODO: only fund can fetch a fund
router.post('/', auth, getClicks);

export default router;
