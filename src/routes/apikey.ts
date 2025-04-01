import { Router } from 'express';
import { createAPIKey, updateAPIKey } from '../controllers/apikey';
import { auth } from '../middleware/auth';

const router = Router();

router.post('/', auth, createAPIKey);
router.put('/:keyId', auth, updateAPIKey);

export default router;