import { User, validateUser } from '@/models/user';
import { Assessment } from '@/models/assessment';
import type { RequestHandler } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import { Notification } from '@/models/notification';
import { getSocketIO } from '@/config/socket-io';
import crypto from 'crypto';
import { Fund, type IFund } from '@/models/fund';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { Click } from '@/models/click';

export const findUsers: RequestHandler = async (_req, res) => {
  console.log('findUsers');
  const users = await User.find({ role: 'user' }).populate('referredBy').populate('fund').select('-password -__v');
  return res.status(200).json(users);
};

export const findCurrentUser: RequestHandler = async (req, res, next) => {
  try {
    const user = await User.findById((req.user as JwtPayload)._id)
      .select('-password -__v')
      .populate('fund');

    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
};

export const register: RequestHandler = async (req, res) => {
  const { error } = validateUser(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { username, email, password, referralCode } = req.body;

    const existingEmail = await User.findOne({ email });
    if (existingEmail)
      return res.status(400).json({ email: 'Email is taken.' });
    const existingUsername = await User.findOne({ username });
    if (existingUsername)
      return res.status(400).json({ username: 'Username is taken' })

    let referredBy: Types.ObjectId | null = null;
    let referringFund: HydratedDocument<IFund> | null = null;

    if (referralCode) {
      referringFund = await Fund.findOne({ referralCode });
      if (!referringFund) {
        return res.status(400).json({ message: 'Invalid referral code' });
      }
      let click = await Click.findOne({ referralCode })
      if (click) {
        click.clicks = [...click.clicks, new Date()];
        await click.save()
      }
      else {
        click = new Click({ referralCode, clicks: [new Date()] })
        await click.save()
      }
      referredBy = referringFund.owner;
    }

    const newUserId = new Types.ObjectId();
    const newFundId = new Types.ObjectId();

    const newUser = new User({
      _id: newUserId,
      email,
      fund: newFundId,
      referredBy,
      username,
    });

    const hash = newUser.hashPassword(password);
    newUser.password = hash;

    const newFund = new Fund({
      _id: newFundId,
      name: username,
      owner: newUserId,
      referralCode: generateReferralCode(),
    });

    await newUser.save({ session });
    await newFund.save({ session });

    if (referringFund) {
      referringFund.referrals.push(newUser._id);
      await referringFund.save({ session });
    }

    const notification = new Notification({
      userId: newUser._id,
      message:
        'New assessment is available, click on the take assessment button to begin',
      type: 'new-assessment-available',
    });

    await notification.save({ session });
    await session.commitTransaction();

    const io = getSocketIO();
    io.to(newUser._id.toString()).emit('notification', notification);

    return res.status(201).json({
      user: {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
      accessToken: newUser.generateAccessToken(),
      refreshToken: await newUser.generateRefreshToken(),
    });
  } catch (error) {
    await session.abortTransaction();
    return res.status(500).json({ error: (error as Error).message });
  } finally {
    await session.endSession();
  }
};

export const findUser: RequestHandler = async (req, res) => {
  const userId = req.params.userId;
  const user = await User.findById(userId).populate('fund').select('-password -__v');
  const referrals = user?.fund?.referrals || [];
  console.log(referrals);
  let referralUsers: any[] = [];
  if (referrals.length > 0) {
    referralUsers = await Promise.all(referrals.map(async (referral) => User.findById(referral).populate('fund').select('-password -__v')));
    console.log("referralUsers", referralUsers);
  }
  const result = { ...user?.toObject(), referrals: referralUsers };
  console.log("user", result);
  return res.status(200).json(result);
};

export const findUserAssessments: RequestHandler = async (req, res) => {
  const assessments = await Assessment.find({
    userId: req.params.userId,
  }).populate({ path: 'userId', select: 'username email' });

  return res.status(200).json(assessments);
};

export const getReferrals: RequestHandler = async (req, res) => {
  const userId = (req.user as JwtPayload)._id;
  const user = await User.findById(userId).populate('fund').select('-password -__v');
  const referrals = user?.fund?.referrals || [];
  let referralNotifications: any[] = [];
  console.log(referrals);
  let referralUsers: any[] = [];
  if (referrals.length > 0) {
    referralUsers = await Promise.all(referrals.map(async (referral) => User.findById(referral).populate('fund').select('-password -__v')));
    console.log("referralUsers", referralUsers);
  }
  if (referralUsers.length > 0) {
    referralNotifications = await Notification.find({ userId: { $in: referrals } }).populate('userId', 'username email');
    console.log("referralNotifications", referralNotifications);
  }
  const result = { ...user?.toObject(), referrals: referralUsers, notifications: referralNotifications };
  console.log("user", result);
  return res.status(200).json(result);
};

// API for leaderboard 2
export const getTopTwitterScoreUsers: RequestHandler = async (_req, res) => {
  try {
    const users = await User.aggregate([
      { $match: { role: 'user' } },
      {
        $lookup: {
          from: 'assessments',
          localField: '_id',
          foreignField: 'userId',
          as: 'assessments'
        }
      },
      { $unwind: { path: '$assessments', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$fund',
          overallScore: { $avg: '$assessments.score' },
          username: { $first: '$username' },
          twitterScore: { $first: '$twitterScore' },
          totalRewardsEarned: { $first: '$totalRewardsEarned' },
          twitterId: { $first: '$twitterId' }
        }
      },
      { $sort: { overallScore: -1 } },
      {
        $project: {
          _id: 1,
          username: 1,
          twitterScore: 1,
          totalRewardsEarned: 1,
          overallScore: 1,
          twitterId: 1
        }
      }
    ]);
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching top users', error });
  }
};

function generateReferralCode(length = 12) {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[crypto.randomInt(chars.length)];
  }
  return result;
}
