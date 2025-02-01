import { model, Schema, Types } from 'mongoose';
import { z } from 'zod';

const NOTIFICATION_TYPE = [
  'assessment-completion',
  'new-assessment-available',
  'new-reward-available',
  'reward-claimed',
  'user-should-be-verified',
  'user-verified',
] as const;

export interface INotification {
  userId: Types.ObjectId;
  message: string;
  type: (typeof NOTIFICATION_TYPE)[number];
  isRead: boolean;
}
const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    type: { type: String, enum: NOTIFICATION_TYPE, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export function validateNotification(assessment: INotification) {
  const schema = z.object({
    userId: z.string().refine((val) => Types.ObjectId.isValid(val)),
    message: z.string(),
    type: z.enum(NOTIFICATION_TYPE),
    isRead: z.boolean(),
  });

  return schema.safeParse(assessment);
}

export const Notification = model('Notification', notificationSchema);
