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
} from '@/controllers/users';
import { isAdmin } from '@/middleware/isAdmin';
import { isAdminOrReferredFund } from '@/middleware/isAdminOrReferredFund';
import { validateObjectId } from '@/middleware/validateId';
import { getClicks } from '@/controllers/clicks';
import { setDailyXP } from '@/utils/dailyXP';

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
router.get('/daily-xp', setDailyXP);
router.get('/:userId', validateObjectId('userId'), auth, isAdmin, findUser);

export default router;
