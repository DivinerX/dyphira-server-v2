import { model, Schema, Types } from 'mongoose';

export interface IFund {
  name: string;
  description: string;
  referralCode: string;
  owner: Types.ObjectId;
  referrals: Types.ObjectId[];
}

const fundSchema = new Schema<IFund>(
  {
    name: { type: String, required: true },
    description: { type: String },
    referralCode: { type: String, unique: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    referrals: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

const Fund = model('Fund', fundSchema);

export { Fund };
