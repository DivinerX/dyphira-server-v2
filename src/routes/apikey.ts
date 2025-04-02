import { Router } from 'express';
import { createAPIKey, getAPIKey, updateAPIKey } from '../controllers/apikey';
import { auth } from '../middleware/auth';

const router = Router();

router.get('/', auth, getAPIKey)
router.post('/', auth, createAPIKey);
router.put('/', auth, updateAPIKey);

export default router;