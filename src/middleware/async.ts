import type { RequestHandler, Request, Response, NextFunction } from 'express';

type AsyncHandler = (
  req: Request,
  res: Response,
  next?: NextFunction,
) => Promise<void>;

export const asyncMiddleware = (handler: AsyncHandler): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      return await handler(req, res, next);
    } catch (error) {
      return next(error);
    }
  };
};
