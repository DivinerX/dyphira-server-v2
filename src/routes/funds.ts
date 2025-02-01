import express from 'express';
import { findFund, register } from '@/controllers/funds';
import { auth } from '@/middleware/auth';
import { validateObjectId } from '@/middleware/validateId';
const router = express.Router();

// TODO: only fund can fetch a fund
router.get('/:fundId', validateObjectId('userId'), auth, findFund);
router.post('/', register);

export default router;
