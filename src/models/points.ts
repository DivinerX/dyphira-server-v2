import mongoose from 'mongoose';

const pointsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  points: {
    type: [{
      date: Date,
      point: Number,
      type: {
        type: String,
        enum: ['daily', 'talent', 'referral', 'api'],
      },
    }],
    default: [],
  }
});

pointsSchema.index({ userId: 1 });

export const Points = mongoose.model('Points', pointsSchema);
