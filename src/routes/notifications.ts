import express from 'express';
import {
  findNotifications,
  createNotification,
  updateNotification,
} from '@/controllers/notifications';
import { auth } from '@/middleware/auth';
import { validateObjectId } from '@/middleware/validateId';

const router = express.Router();

router.get('/', auth, findNotifications);
router.post('/', auth, createNotification);
router.patch(
  '/:notificationId',
  validateObjectId('notificationId'),
  auth,
  updateNotification,
);

export default router;
