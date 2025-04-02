import type { RequestHandler } from 'express';
import APIKey from '@/models/apikey';
import { Points } from '@/models/points';

export const apiKeyMiddleware: RequestHandler = async (req, res, next) => {
  const key =
    req.headers['authorization']?.slice(7);
  console.log(key)
  if (!key)
    return res.status(401).json({ error: 'Access denied. No api key provided.' });
  try {
    const apiKey = await APIKey.findOne({ key });
    if (!apiKey) {
      return res.status(401).json({ error: 'Invalid API key.' });
    }
    const pointSum = await Points.aggregate([
      { $match: { userId: apiKey.user } },  // Match documents with the specific userId
      { $unwind: "$points" },  // Deconstruct the points array
      {
        $group: {
          _id: "$userId",  // Group by userId
          totalPoints: { $sum: "$points.point" }  // Sum all point values
        }
      }
    ]);
    console.log(pointSum)
    if (pointSum[0].totalPoints < 10)
      return res.status(403).json({ error: 'Unsufficient credits' })
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid API key.' });
  }
};
