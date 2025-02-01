import { User } from '@/models/user';
import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: {
    _id: string;
    role: string;
  };
}

export const isAdminOrReferredFund = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let userId: undefined | string;

  if (req.params.userId) {
    userId = req.params.userId;
  } else if (req.query.userId) {
    userId = req.query.userId as string;
  }

  const authRequest = req as AuthRequest;

  try {
    if (!authRequest.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (authRequest.user.role === 'admin') {
      return next();
    }

    // If the user is a fund, check if they referred the user with userId
    if (authRequest.user.role === 'fund') {
      if (!userId)
        return res.status(400).json({ message: 'User ID not provided' });

      const referredUser = await User.findById(userId).lean(); // Assuming User model exists
      if (referredUser?.referredBy?.toString() === authRequest.user._id) {
        return next();
      }
    }

    return res.status(403).json({ error: 'Access denied.' });
  } catch (error) {
    return next(error);
  }
};
