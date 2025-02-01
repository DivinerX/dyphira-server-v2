import { model, Schema } from 'mongoose';

export interface IClick {
  referralCode: string;
  clicks: Date[];
}

const clickSchema = new Schema<IClick>(
  {
    referralCode: { type: Schema.Types.String, required: true },
    clicks: [{
      type: Date,
      default: Date.now
    }],
  },
  { timestamps: true },
);

const Click = model('Click', clickSchema);

export { Click };
