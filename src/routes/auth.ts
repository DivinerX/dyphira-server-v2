import express from 'express';
import {
  login,
  initiatePasswordReset,
  refreshToken,
  resetPassword,
  validateResetPasswordToken,
  fundLogin,
  adminLogin,
} from '@/controllers/auth';

const router = express.Router();

router.post('/', login);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', initiatePasswordReset);
router.get('/reset-password/:token', validateResetPasswordToken);
router.post('/reset-password/:token', resetPassword);

router.post('/fund', fundLogin);
router.post('/admin', adminLogin);

export default router;
