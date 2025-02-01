import { model, Schema, Types } from 'mongoose';
import { z } from 'zod';

export interface IReward {
  userId: Types.ObjectId;
  amount: number;
  referralEarned: boolean;
  isClaimed: boolean;
  claimedAt: Date;
  earnedAt: Date;
}

const rewardSchema = new Schema<IReward>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    referralEarned: {
      type: Boolean,
      required: true,
      default: false,
    },
    earnedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    isClaimed: {
      type: Boolean,
      required: true,
      default: false,
    },
    claimedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

const Reward = model('Reward', rewardSchema);

function validateReward(reward: IReward) {
  const schema = z.object({
    sectionId: z.string().refine((val) => Types.ObjectId.isValid(val)),
    text: z.string().min(1).max(1000),
    order: z.number().min(1),
  });

  return schema.safeParse(reward);
}

export { Reward, validateReward };
