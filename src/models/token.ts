import { Schema, model } from 'mongoose';

interface Token {
  token: string;
  userId: Schema.Types.ObjectId;
  createdAt: Date;
}

const tokenSchema = new Schema<Token>({
  token: {
    type: String,
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600,
  },
});

module.exports = model('Token', tokenSchema);
