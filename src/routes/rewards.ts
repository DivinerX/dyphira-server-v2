import express from 'express';
import { auth } from '@/middleware/auth';
import { findRewards, claimReward, findAllRewards, findPaymentHistory } from '@/controllers/rewards';

const router = express.Router();

router.get('/', auth, findRewards);
router.get('/payment-history', auth, findPaymentHistory);
router.get('/all', auth, findAllRewards);
router.post('/claim', auth, claimReward);

export default router;
