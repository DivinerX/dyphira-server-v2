import { Notification, validateNotification } from '@/models/notification';
import type { RequestHandler } from 'express';
import type { JwtPayload } from 'jsonwebtoken';

export const findNotifications: RequestHandler = async (req, res, next) => {
  const userId = (req.user as JwtPayload)._id;

  try {
    const { sort = 'desc', page = 1, limit = 10 } = req.query;
    const sortOrder = sort === 'asc' ? 1 : -1;
    const pageNumber = Math.max(1, parseInt(page as string) || 1);
    const limitNumber = Math.min(100, parseInt(limit as string) || 10);

    const skip = (pageNumber - 1) * limitNumber;

    const [notifications, totalCount] = await Promise.all([
      Notification.find({ userId })
        .sort({ createdAt: sortOrder })
        .limit(limitNumber)
        .skip(skip),
      Notification.countDocuments(),
    ]);

    res.status(200).json({
      notifications,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limitNumber),
      totalCount,
      limit,
    });
  } catch (error) {
    next(error);
  }
};

export const createNotification: RequestHandler = async (req, res, next) => {
  const userId = (req.user as JwtPayload)._id;

  const { error } = validateNotification({ ...req.body, userId });

  if (error) return next(error);

  try {
    const { message, type } = req.body;
    const newNotification = new Notification({ userId, message, type });
    await newNotification.save();

    return res.status(201).json(newNotification);
  } catch (error) {
    next(error);
  }
};

export const updateNotification: RequestHandler = async (req, res, next) => {
  const userId = (req.user as JwtPayload)._id;

  const { error } = validateNotification({ ...req.body, userId });

  if (error) return next(error);

  try {
    const { isRead } = req.body;
    const notification = await Notification.findOne({ userId });

    if (!notification)
      return res.status(404).send({ message: 'Notification not found' });

    notification.isRead = isRead;
    await notification.save();

    return res.status(200).json(notification);
  } catch (error) {
    next(error);
  }
};
