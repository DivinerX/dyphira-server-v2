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
import { MulterS3File } from './assessments';
import { getLocation } from '@/utils/getLocation';

export const findUsers: RequestHandler = async (_req, res) => {
  const users = await User.aggregate([
    { $match: { role: 'user' } },
    {
      $lookup: {
        from: 'points',
        localField: '_id',
        foreignField: 'userId',
        as: 'pointsData'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'referredBy',
        foreignField: '_id',
        as: 'referredBy'
      }
    },
    {
      $lookup: {
        from: 'funds',
        localField: 'fund',
        foreignField: '_id',
        as: 'fund'
      }
    },
    {
      $unwind: { path: '$pointsData', preserveNullAndEmptyArrays: true }
    },
    {
      $unwind: { path: '$referredBy', preserveNullAndEmptyArrays: true }
    },
    {
      $unwind: { path: '$fund', preserveNullAndEmptyArrays: true }
    },
    {
      $group: {
        _id: '$_id',
        username: { $first: '$username' },
        email: { $first: '$email' },
        role: { $first: '$role' },
        referredBy: { $first: '$referredBy' },
        fund: { $first: '$fund' },
        createdAt: { $first: '$createdAt' },
        twitterId: { $first: '$twitterId' },
        xp: { $first: '$twitterScore' },
        credits: {
          $sum: {
            $reduce: {
              input: '$pointsData.points',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.point'] }
            }
          }
        }
      }
    },
    {
      $sort: {
        createdAt: -1
      }
    },
    {
      $project: {
        _id: 1,
        username: 1,
        email: 1,
        role: 1,
        referredBy: 1,
        fund: 1,
        xp: 1,
        credits: 1,
        createdAt: 1,
        twitterId: 1,
      }
    }
  ]);

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
    const ip = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress)?.toString()?.split(',')[0]?.trim();
    const ipv4 = ip?.replace(/^::ffff:/, '');
    const location = await getLocation(ipv4);
    const newUser = new User({
      _id: newUserId,
      email,
      fund: newFundId,
      referredBy,
      username,
      ip: ipv4,
      city: location?.city,
      countryCode: location?.countryCode,
      latitude: location?.latitude,
      longitude: location?.longitude,
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
  console.log(referrals)
  let referralNotifications: any[] = [];
  let referralUsers: any[] = [];
  if (referrals.length > 0) {
    referralUsers = await User.aggregate([
      { $match: { _id: { $in: referrals } } },
      { $lookup: { from: 'points', localField: '_id', foreignField: 'userId', as: 'pointsData' } },
      { $unwind: { path: '$pointsData', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$_id',
          username: { $first: '$username' },
          twitterScore: { $first: '$twitterScore' },
          twitterId: { $first: '$twitterId' },
          createdAt: { $first: '$createdAt' },
          pointsEarned: {
            $sum: {
              $reduce: {

                input: '$pointsData.points',
                initialValue: 0,
                in: { $add: ['$$value', '$$this.point'] }
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          username: 1,
          twitterScore: 1,
          twitterId: 1,
          pointsEarned: 1,
          createdAt: 1
        }
      }
    ]);
  }
  if (referralUsers.length > 0) {
    referralNotifications = await Notification.find({ userId: { $in: referrals } }).populate('userId', 'username email');
  }
  const result = { ...user?.toObject(), referrals: referralUsers, notifications: referralNotifications };
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
          overallScore: {
            $avg: {
              $add: [
                { $ifNull: ['$assessments.score.IQ', 0] },
                { $ifNull: ['$assessments.score.evangelism', 0] },
                { $ifNull: ['$assessments.score.determination', 0] },
                { $ifNull: ['$assessments.score.effectiveness', 0] },
                { $ifNull: ['$assessments.score.vision', 0] }
              ]
            }
          },
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

export const getUserReferralPoints: RequestHandler = async (req, res) => {
  try {
    const userId = (req.user as JwtPayload)._id;
    const userPoints = await Points.findOne({ userId });
    const totalAccumulatedPoints = userPoints?.points.filter(point => point.type === 'referral').reduce((acc, point) => acc + (point.point || 0), 0);
    const weeklyAccumulatedPoints = userPoints?.points.filter(point => point.type === 'referral' && point.date && point.date > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).reduce((acc, point) => acc + (point.point || 0), 0);
    const weeklyPoints = userPoints?.points.filter(point => point.type === 'referral' && point.date && point.date > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    console.log(weeklyPoints)
    return res.status(200).json({ totalAccumulatedPoints, weeklyAccumulatedPoints, weeklyPoints });
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Error fetching referral points', error: err });
  }
};

export const updateUser: RequestHandler = async (req, res) => {
  const userId = (req.user as JwtPayload)._id;
  const data = req.body;
  const avatar = req.file ? (req.file as MulterS3File).location : undefined;
  console.log(req.file)
  const user = await User.findById(userId).select('-password -__v').populate('fund');
  if (!user) return res.status(404).json({ message: 'User not found' });
  user.username = data.username;
  user.email = data.email;
  if (avatar) {
    user.avatar = avatar;
  }
  await user.save();
  return res.status(200).json(user);
};

export const updateWalletAddress: RequestHandler = async (req, res) => {
  const userId = (req.user as JwtPayload)._id;
  const { walletAddress } = req.body;

  const user = await User.findById(userId).select('-password -__v');
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.walletAddress = walletAddress;
  await user.save();

  return res.status(200).json(user);
};

export const getDepositAmount: RequestHandler = async (req, res) => {
  try {
    const userId = (req.user as JwtPayload)._id;
    const user = await User.findById(userId).select('-password -__v');
    const walletAddress = user?.walletAddress;
    console.log("walletAddress", walletAddress)
    if (!walletAddress) return res.status(404).json({ message: 'Wallet not found' });
    const response = await fetch(`https://dyphira-chain.fly.dev/transactions`)
    console.log("response", response)
    const {transactions} = await response.json() as {transactions: {from: string; to: string, amount: number}[]}
    console.log(transactions)
    const depositAmount = transactions.reduce((acc: number, transaction) => {
      if (transaction.from === walletAddress && transaction.to === "0x7680f2fdd225f1fc27af4a2eff072814fa1c4d62") {
        return acc + transaction.amount;
      }
      return acc;
    }, 0);
    console.log("transactions", transactions)
    return res.status(200).json({ depositAmount });
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error fetching deposit amount', error });
  }
};

export const getDashboardFeed: RequestHandler = async (_req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('username avatar ip city countryCode latitude longitude createdAt');
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching dashboard feed', error });
  }
}

function generateReferralCode(length = 12) {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[crypto.randomInt(chars.length)];
  }
  return result;
}
