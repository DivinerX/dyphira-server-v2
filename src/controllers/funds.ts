import { User, validateUser } from '@/models/user';
import { RequestHandler } from 'express';
import crypto from 'crypto';
import { Fund } from '@/models/fund';
import mongoose, { Types } from 'mongoose';

export const findFund: RequestHandler = async (req, res, next) => {
  try {
    const fundId = req.params.fundId;
    const populateReferrals = req.query.populateReferrals === 'true';

    let query = Fund.findById(fundId);

    if (populateReferrals) {
      query = query.populate('referrals', 'username email');
    }

    const fund = await query.exec();

    if (!fund) {
      return res.status(404).json({ message: 'Fund not found.' });
    }

    return res.status(200).json(fund);
  } catch (error) {
    return next(error);
  }
};

function generateReferralCode(length = 8) {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[crypto.randomInt(chars.length)];
  }
  return result;
}

export const register: RequestHandler = async (req, res) => {
  const { error } = validateUser(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { email, password, fundName, description } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: 'User already registered.' });

    const newUserId = new Types.ObjectId();
    const newFundId = new Types.ObjectId();

    const newUser = new User({
      _id: newUserId,
      email,
      role: 'fund',
      fund: newFundId,
    });

    const hash = newUser.hashPassword(password);
    newUser.password = hash;

    const newFund = new Fund({
      _id: newFundId,
      name: fundName,
      description,
      owner: newUserId,
      referralCode: generateReferralCode(),
    });

    // await newUser.save({ session });
    await newUser.save();
    // await newFund.save({ session });
    await newFund.save();

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      user: {
        _id: newUser._id,
        email: newUser.email,
        fund: newFund._id,
      },
      accessToken: newUser.generateAccessToken(),
      refreshToken: await newUser.generateRefreshToken(),
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ error: (err as Error).message });
  }
};
