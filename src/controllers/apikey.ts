import { Request, Response } from 'express';
import APIKey from '../models/apikey';
import { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';

export const getAPIKey = async (req: Request, res: Response) => {
	try {
		const userId = (req.user as JwtPayload)._id;

		const apiKey = await APIKey.findOne({ user: userId });
		if (!apiKey) {
			return res.status(404).json({ error: 'API key doesn\'t exist' });
		}

		return res.status(200).json(apiKey);
	} catch (error) {
		return res.status(500).json({ error: 'Failed to get API key' });
	}
};

export const createAPIKey = async (req: Request, res: Response) => {
	const userId = (req.user as JwtPayload)._id;

	const key = crypto.randomBytes(32).toString('hex');

	const existingKey = await APIKey.findOne({ user: userId });
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

export const updateAPIKey = async (req: Request, res: Response) => {
	const userId = (req.user as JwtPayload)._id;

	try {
		const apiKey = await APIKey.findOne({ user: userId });

		if (!apiKey) {
			return res.status(404).json({ error: 'API key not found' });
		}
		const key = crypto.randomBytes(32).toString('hex');

		apiKey.key = key;
		await apiKey.save();

		return res.status(200).json(apiKey);
	} catch (error) {
		return res.status(500).json({ error: 'Failed to update API key' });
	}
};