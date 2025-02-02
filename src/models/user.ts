import { model, Schema } from 'mongoose';
import validator from 'validator';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { RefreshToken } from './refreshToken';
import { REFRESH_TOKEN_LIFETIME } from '@/config/constants';
import bcrypt from 'bcrypt';

const USER_ROLE = ['admin', 'user', 'fund'];

export interface IUser {
  username: string;
  email: string;
  password: string;
  role: (typeof USER_ROLE)[number];
  verified: boolean;
  loginAttempts: number;
  lockUntil: Date | null;
  totalRewardsEarned: number;

  referredBy?: string;
  fund?: any;

  resetPasswordToken: string | undefined;
  resetPasswordExpires?: Date | undefined;
  
  twitterScore?: number;

  hashPassword(password: string): string;
  comparePassword(password: string): boolean;
  generateAccessToken(this: IUser): string;
  generateRefreshToken(this: IUser): Promise<string>;
  isLocked(): boolean;
  generatePasswordReset(this: IUser): string;

  facebookId?: string;
  twitterId?: string;
  redditId?: string;
  linkedinId?: string;
  instagramId?: string;
  worldidId?: string;
  xp: number;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      minlength: 1,
      maxlength: 50,
      // Only required if the role is not 'fund'
      required: function () {
        return this.role !== 'fund';
      },
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      lowercase: true,
      validate: [validator.isEmail, '{VALUE} is not a valid email.'],
      index: true,
    },
    password: { type: String, minLength: 8, maxLength: 255, required: true },
    role: {
      type: String,
      enum: USER_ROLE,
      default: 'user',
    },
    verified: {
      type: Boolean,
      default: false,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    totalRewardsEarned: {
      type: Number,
      default: 0,
    },

    referredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    // Reference to Fund for fund users
    fund: {
      type: Schema.Types.ObjectId,
      ref: 'Fund',
    },
    twitterScore: {
      type: Number,
      default: 0,
    },
    xp: {
      type: Number,
      default: 0,
    },

    facebookId: String,
    redditId: String,
    twitterId: String,
    linkedinId: String,
    instagramId: String,
    worldidId: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { timestamps: true },
);

userSchema.methods.hashPassword = function (password: string) {
  return bcrypt.hashSync(password, 10);
};

userSchema.methods.comparePassword = function (password: string) {
  return bcrypt.compareSync(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { _id: this._id, role: this.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '15m' },
  );
};

userSchema.methods.generateRefreshToken = async function () {
  const refreshToken = jwt.sign(
    { _id: this._id },
    process.env.JWT_SECRET as string,
    {
      expiresIn: `${REFRESH_TOKEN_LIFETIME}s`,
    },
  );

  await RefreshToken.create({ token: refreshToken, userId: this._id });

  return refreshToken;
};

userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

userSchema.methods.generatePasswordReset = function () {
  this.resetPasswordToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // expires in an hour
};

const User = model('User', userSchema);

function validateUser(user: IUser) {
  const generalUserSchema = z.object({
    username: z.string().min(1).max(50),
    email: z.string().email().min(5).max(255),
    password: z.string().min(8).max(255),
  });

  const fundUserSchema = z.object({
    fundName: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    email: z.string().email().min(5).max(255),
    password: z.string().min(8).max(255),
    role: z.literal('fund').default('fund'),
  });

  if (user.role === 'fund') {
    return fundUserSchema.safeParse(user);
  }

  return generalUserSchema.safeParse(user);
}

export { User, validateUser };
