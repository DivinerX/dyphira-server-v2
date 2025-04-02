import { Request, Response } from 'express';
import APIUsage from '../models/apiUsage';
import { JwtPayload } from 'jsonwebtoken';

export const getAPIUsage = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as JwtPayload)._id;
    const apiUsage = await APIUsage.find({ user: userId });
    if (!apiUsage) {
      return res.status(404).json({ error: 'API key doesn\'t exist' });
    }

    return res.status(200).json(apiUsage);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create API key' });
  }
};