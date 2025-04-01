import type { RequestHandler } from 'express';
import APIKey from '@/models/apikey';

export const auth: RequestHandler = async (req, res, next) => {
  const key =
    req.headers.apikey;
  if (!key)
    return res.status(401).json({ error: 'Access denied. No api key provided.' });
  try {
    const apiKey = await APIKey.findOne({ key });
    if (!apiKey) {
      return res.status(401).json({ error: 'Invalid API key.' });
    }
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid API key.' });
  }
};
