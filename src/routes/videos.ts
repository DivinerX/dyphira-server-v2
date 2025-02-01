import express from 'express';
import { auth } from '@/middleware/auth';
import { generateVideoURL, findVideo } from '@/controllers/videos';
import { isAdminOrReferredFund } from '@/middleware/isAdminOrReferredFund';

const router = express.Router();

router.get(
  '/generate-video-url/:filename',
  auth,
  isAdminOrReferredFund,
  generateVideoURL,
);
router.get('/:filename', findVideo);

export default router;
