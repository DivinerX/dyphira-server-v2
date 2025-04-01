import { Request, Response } from 'express';
import APIKey from '../models/apikey';
import { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';

export const createAPIKey = async (req: Request, res: Response) => {
    const userId = (req.user as JwtPayload)._id;

    const key = crypto.randomBytes(32).toString('hex');


    const existingKey = await APIKey.findOne({ key });
    if (existingKey) {
        return res.status(400).json({ error: 'API key already exists' });
    }

    try {
        const apiKey = await APIKey.create({ key, user: userId });
        return res.status(201).json(apiKey);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to create API key' });
    }
};