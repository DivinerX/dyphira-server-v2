import { REFRESH_TOKEN_LIFETIME } from '@/config/constants';
import { model, Schema } from 'mongoose';

const RefreshTokenSchema = new Schema({
  token: String,
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now, expires: REFRESH_TOKEN_LIFETIME },
});

const RefreshToken = model('RefreshToken', RefreshTokenSchema);

export { RefreshToken };
