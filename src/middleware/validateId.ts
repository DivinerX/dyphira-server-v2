import { Types } from 'mongoose';
import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware to validate MongoDB ObjectId.
 * @param {string} paramName - The name of the parameter to validate.
 */
export const validateObjectId =
  (paramName: string) => (req: Request, res: Response, next: NextFunction) => {
    const objectId = req.params[paramName];
    if (objectId && !Types.ObjectId.isValid(objectId))
      return res.status(400).json({ error: `Invalid "${paramName}"` });

    return next();
  };
