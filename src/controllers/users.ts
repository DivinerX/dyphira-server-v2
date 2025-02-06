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
import { Points } from '@/models/points';

export const findUsers: RequestHandler = async (_req, res) => {
  const users = await User.find({ role: 'user' }).populate('referredBy').populate('fund').select('-password -__v');
  return res.status(200).json(users);
};

export const findCurrentUser: RequestHandler = async (req, res, next) => {
  try {
    const user = await User.findById((req.user as JwtPayload)._id)
      .select('-password -__v')
      .populate('fund');

    const userPoints = await Points.findOne({ userId: user?._id });
    const totalPoints = userPoints?.points.reduce((acc, point) => acc + (point.point || 0), 0) || 0;
    const result = { ...user?.toObject(), points: totalPoints };
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.status(200).json(result);

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
  let referralUsers: any[] = [];
  if (referrals.length > 0) {
    referralUsers = await Promise.all(referrals.map(async (referral) => User.findById(referral).populate('fund').select('-password -__v')));
  }
  const result = { ...user?.toObject(), referrals: referralUsers };
  return res.status(200).json(result);
};

export const findUserAssessments: RequestHandler = async (req, res) => {
  const assessments = await Assessment.find({
    userId: req.params.userId,
  }).populate({ path: 'userId', select: 'username email' });

  return res.status(200).json(assessments);
};

export const findUserRank: RequestHandler = async (req, res) => {
  try {
    const userId = (req.user as JwtPayload)._id;
    const targetUser = await User.findById(userId).populate('fund').select('-password -__v');
    const users = await User.find({ role: 'user' }).select('-password -__v');
    const targetUserPoints = await Points.aggregate([
      { $match: { userId: targetUser?._id } },
      { $unwind: '$points' },
      { $group: { _id: '$userId', totalPoints: { $sum: '$points.point' } } }
    ]);
    const targetUserPointsTotal = targetUserPoints[0]?.totalPoints || 0;
    const points = await Points.find({ userId: { $ne: targetUser?._id } }).select('points');
    const rank = points.filter(point => point.points.reduce((acc, point) => acc + (point.point || 0), 0) > targetUserPointsTotal).length;
    const percentile = (rank / users.length) * 100;
    return res.status(200).json({ rank, percentile });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
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

export const getTopTwitterScoreUsers: RequestHandler = async (req, res) => {
  type TPeriod = '24h' | '7d' | '30d' | 'all';
  const period = req.query.period as TPeriod;
  const sortBy = req.query.sortBy as 'points' | 'xp';
  const sortby = sortBy === 'points' ? 'points' : 'overallScore';
  const now = new Date();
  const periodDate = period === '24h' ? new Date(now.getTime() - 24 * 60 * 60 * 1000) :
    period === '7d' ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) :
      period === '30d' ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) :
        new Date(0);
  try {
    const users = await User.aggregate([
      { $match: { role: 'user' } },
      {
        $lookup: {
          from: 'assessments',
          localField: '_id',
          foreignField: 'userId',
          pipeline: [
            {
              $match: {
                updatedAt: { $gte: periodDate }
              }
            }
          ],
          as: 'assessments'
        }
      },
      {
        $lookup: {
          from: 'points',
          localField: '_id',
          foreignField: 'userId',
          as: 'pointsData',
        }
      },
      { $unwind: { path: '$assessments', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$pointsData', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$fund',
          overallScore: { $sum: '$assessments.score' },
          username: { $first: '$username' },
          twitterScore: { $first: '$twitterScore' },
          twitterId: { $first: '$twitterId' },
          points: {
            $sum: {
              $reduce: {
                input: {
                  $filter: {
                    input: '$pointsData.points',
                    as: 'point',
                    cond: { $gte: ['$$point.date', periodDate] }
                  }
                },
                initialValue: 0,
                in: { $add: ['$$value', '$$this.point'] }
              }
            }
          }
        }
      },
      { $sort: { [sortby]: -1 } },
      {
        $project: {
          _id: 1,
          username: 1,
          twitterScore: 1,
          points: 1,
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
