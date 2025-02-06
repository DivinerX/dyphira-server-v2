import { Reward } from '@/models/reward';
import { User } from '@/models/user';
import type { RequestHandler } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import mongoose from 'mongoose';

export const findRewards: RequestHandler = async (req, res, next) => {
  try {
    const userId = (req.user as JwtPayload)._id;

    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    let claimableRewards = 0;
    let referralEarnings = 0;
    if (user.verified === true) {
      const claimableRewardsResult = await Reward.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            referralEarned: false,
            isClaimed: false,
          },
        },
        { $group: { _id: null, claimableRewards: { $sum: '$amount' } } },
      ]);
      const referralEarningsResult = await Reward.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            referralEarned: true,
            isClaimed: false,
          },
        },
        { $group: { _id: null, referralEarnings: { $sum: '$amount' } } },
      ]);
      claimableRewards = claimableRewardsResult[0]?.claimableRewards || 0;
      referralEarnings = referralEarningsResult[0]?.referralEarnings || 0;
    }

    return res.status(200).json({ claimableRewards, referralEarnings });
  } catch (error) {
    return next(error);
  }
};

export const findPaymentHistory: RequestHandler = async (req, res, next) => {
  try {
    const userId = (req.user as JwtPayload)._id;
    const rewards = await Reward.find({ userId });
    return res.status(200).json(rewards);
  } catch (error) {
    return next(error);
  }
};

export const findAllRewards: RequestHandler = async (req, res, next) => {
  try {
    const userId = (req.user as JwtPayload)._id;

    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const rewards = await Reward.find();
    return res.status(200).json( rewards );
  } catch (error) {
    return next(error);
  }
};

export const addReward: RequestHandler = async (req, res, next) => {
  try {
    const userId = (req.user as JwtPayload)._id;
    const { amount } = req.body;

    const newReward = new Reward({
      userId,
      amount,
      isClaimed: false,
      earnedAt: new Date(),
    });

    await newReward.save();

    await User.findByIdAndUpdate(userId, {
      $inc: { totalRewardsEarned: amount },
    });

    return res.status(201).json({
      message: 'Reward added successfully',
      reward: newReward,
    });
  } catch (error) {
    return next(error);
  }
};
