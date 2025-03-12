import express from 'express';
import { auth } from '@/middleware/auth';
import {
  findCurrentUser,
  findUsers,
  register,
  findUserAssessments,
  findUser,
  getTopTwitterScoreUsers,
  getReferrals,
  findUserRank,
  updateUser,
  getUserReferralPoints,
  getDashboardFeed,
} from '@/controllers/users';
import { upload } from '@/config/multer';
import { isAdmin } from '@/middleware/isAdmin';
import { isAdminOrReferredFund } from '@/middleware/isAdminOrReferredFund';
import { validateObjectId } from '@/middleware/validateId';
import { getDailyPoints, getRealTimePoints } from '@/utils/dailyPoints';

import { verify } from '@/utils/twitterVerify';
import { getClicks } from '@/controllers/clicks';

const router = express.Router();

router.get('/me', auth, findCurrentUser);
router.post('/', register);

router.get('/', auth, isAdmin, findUsers);
router.get(
  '/:userId/assessments',
  validateObjectId('userId'),
  auth,
  isAdminOrReferredFund,
  findUserAssessments,
);

router.get('/leadership', getTopTwitterScoreUsers);
router.get('/referrals', auth, getReferrals);
router.get('/clicks', auth, getClicks);
router.get('/daily-points', getDailyPoints);
router.get('/real-time-points', getRealTimePoints);
router.get('/rank', auth, findUserRank);
router.get('/twitter-verify/:rest_id', verify);
router.get('/referral-points', auth, getUserReferralPoints);
router.get('/dashboard-feed', getDashboardFeed);

router.put('/', auth, upload.single('avatar'), updateUser);
router.get('/:userId', validateObjectId('userId'), auth, isAdmin, findUser);
export default router;
