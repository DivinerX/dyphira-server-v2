import { getSocketIO } from '@/config/socket-io';
import { Notification } from '@/models/notification';
import { Reward } from '@/models/reward';
import { User } from '@/models/user';
import { claimUSDC } from '@/utils/claimUSDC';
import type { RequestHandler } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import mongoose from 'mongoose';

export const findRewards: RequestHandler = async (req, res, next) => {
  try {
    const userId = (req.user as JwtPayload)._id;

    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const totalRewardsEarned = user.totalRewardsEarned;

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

    return res.status(200).json({ totalRewardsEarned, claimableRewards, referralEarnings });
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

export const claimReward: RequestHandler = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = (req.user as JwtPayload)._id;
    const { publicKey } = req.body;
    if (!publicKey) {
      return res.status(400).json({ success: false, message: 'publicKey address is required' });
    }

    console.log(userId)
    const claimer = await User.findById(userId);
    if (!claimer || !claimer.twitterId || claimer.verified === false) {
      return res
        .status(404)
        .json({ error: 'User should have twitterId and be verified' });
    }
    const reward = await Reward.findOne({
      userId,
      isClaimed: false,
    });

    console.log(reward)
    if (!reward) {
      return res
        .status(404)
        .json({ error: 'Reward not found or already claimed' });
    }
    const result = await claimUSDC(publicKey);

    reward.isClaimed = true;
    reward.claimedAt = new Date();
    const notification = new Notification({
      userId,
      message:
        'Congratulations, you have successfully received 10USDC as a reward for the assessment',
      type: 'reward-claimed',
    });

    await notification.save({ session });
    console.log(notification)
    const io = getSocketIO();

    await reward.save({ session });
    await User.findByIdAndUpdate(
      userId,
      {
        $inc: { totalRewardsEarned: 10 },
      },
      { session },
    );

    io.to(userId).emit('notification', notification);

    await session.commitTransaction();
    session.endSession();
    return res
      .status(201)
      .json(result);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(error);
  }
};
