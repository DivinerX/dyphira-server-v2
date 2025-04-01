import { Schema, model } from 'mongoose';

export interface IAPIKey {
  key: string;
  user: string;
}

const apiKeySchema = new Schema({
  key: { type: String, required: true, unique: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true
});

const APIKey = model<IAPIKey>('APIKey', apiKeySchema);

export default APIKey;
