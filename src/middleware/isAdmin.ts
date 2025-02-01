import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: {
    _id: string;
    role: string;
  };
}

export const isAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authRequest = req as AuthRequest;

  if (!authRequest.user) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  if (authRequest.user.role !== 'admin') {
    return res
      .status(403)
      .json({ error: 'Access denied. Admin rights required.' });
  }

  return next();
};
