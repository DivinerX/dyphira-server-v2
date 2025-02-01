import { User } from '@/models/user';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { sendResetPasswordEmail } from '@/utils/sendEmail';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { RefreshToken } from '@/models/refreshToken';

export const login: RequestHandler = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('-__v');
  if (!user)
    return res.status(400).json({ email: 'There is no user with that email' });

  const isPasswordMatch = user.comparePassword(password);
  if (!isPasswordMatch) {
    await user.save();
    return res.status(400).json({ password: 'Password does not match.' });
  }
  await user.save();

  return res.json({
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
    },
    accessToken: user.generateAccessToken(),
    refreshToken: await user.generateRefreshToken(),
  });
};

export const fundLogin: RequestHandler = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email, role: 'fund' }).select('-__v');
  if (!user)
    return res.status(400).json({ error: 'Invalid Email or password.' });

  const isPasswordMatch = user.comparePassword(password);
  if (!isPasswordMatch) {

    await user.save();
    return res.status(400).json({ error: 'Invalid Email or password.' });
  }

  await user.save();

  return res.json({
    user: {
      _id: user._id,
      email: user.email,
      fund: user.fund,
    },
    accessToken: user.generateAccessToken(),
    refreshToken: await user.generateRefreshToken(),
  });
};

export const adminLogin: RequestHandler = async (req, res) => {
  const { email, password } = req.body;

  const admin = await User.findOne({ email, role: 'admin' }).select('-__v');
  if (!admin) {
    return res.status(400).json({ message: 'Invalid admin credentials.' });
  }


  const isPasswordMatch = admin.comparePassword(password);
  if (!isPasswordMatch) {
    await admin.save();
    return res.status(400).json({ error: 'Invalid admin credentials.' });
  }

  await admin.save();

  return res.json({
    user: {
      _id: admin._id,
      username: admin.username,
      email: admin.email,
    },
    accessToken: admin.generateAccessToken(),
    refreshToken: await admin.generateRefreshToken(),
  });
};

export const refreshToken: RequestHandler = async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken)
    return res.status(401).json({ error: 'Refresh token is required.' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET as string);

    const existingToken = await RefreshToken.findOne({
      token: refreshToken,
      userId: (decoded as JwtPayload)?._id,
    });

    if (!existingToken) {
      // Token reuse detected
      // Optionally, you can take additional actions such as logging the incident
      return res.status(401).json({ error: 'Invalid refresh token.' });
    }

    const user = await User.findById((decoded as JwtPayload)._id).select(
      '-__v',
    );

    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Invalidate the old refresh token
    await existingToken.deleteOne();

    return res.status(200).json({
      accessToken: user.generateAccessToken(),
      refreshToken: await user.generateRefreshToken(),
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Refresh token has expired.' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Malformed refresh token.' });
    }

    return next(error);
  }
};

export const initiatePasswordReset: RequestHandler = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user)
    return res
      .status(400)
      .json({ message: 'User with this email does not exist.' });

  user.generatePasswordReset();
  try {
    const { resetPasswordToken } = await user.save();
    await sendResetPasswordEmail(email, resetPasswordToken as string);
    return res.status(200).json({ message: 'Email sent.' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to send email.' });
  }
};

export const validateResetPasswordToken: RequestHandler = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user)
    return res
      .status(400)
      .json({ message: 'Password reset token is invalid or has expired.' });

  return res.status(200).json({ message: 'Password reset token is valid.' });
};

export const resetPassword: RequestHandler = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const schema = z.string().min(8).max(255);
  const { error } = schema.safeParse(password);
  if (error) return res.status(400).json({ error: error.message });

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user)
    return res
      .status(400)
      .json({ error: 'Password reset token is invalid or has expired.' });

  const hash = user.hashPassword(password);
  user.password = hash;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return res.status(200).json({ message: 'Password reset successfully.' });
};
