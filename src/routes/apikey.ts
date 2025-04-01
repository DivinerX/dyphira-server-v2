import { Router } from 'express';
import { createAPIKey } from '../controllers/apikey';
import { auth } from '../middleware/auth';

const router = Router();

router.post('/', auth, createAPIKey);

export default router;