import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

export const verifyAccessToken: RequestHandler = (req, res, next) => {
  const token = req.query.accessToken;

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.decode(token as string);
    console.log(decoded);
    if (!decoded || typeof decoded !== 'object') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if ('exp' in decoded && decoded.exp && decoded.exp < Date.now() / 1000) {
      console.log(decoded.exp, Date.now() / 1000);
      return res.status(401).json({ error: 'Token expired' });
    }
    req.user = decoded as jwt.JwtPayload;
    return next();
  } catch (error) {
    return next(error);
  }
};
