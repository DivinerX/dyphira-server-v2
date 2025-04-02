import { Router } from 'express';
import { auth } from '../middleware/auth';
import { getAPIUsage } from '@/controllers/apiUsage';

const router = Router();

router.get('/', auth, getAPIUsage);

export default router;