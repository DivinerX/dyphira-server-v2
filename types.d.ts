// types.d.ts
import { JwtPayload } from 'jsonwebtoken';

// Extend the Express Request interface to include a user property
declare global {
  namespace Express {
    interface Request {
      user?: string | JwtPayload;
    }
  }
}
