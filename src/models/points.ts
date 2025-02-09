import mongoose from 'mongoose';

const pointsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: Date,
  points: {
    type: [{
      date: Date,
      point: Number,
      type: {
        type: String,
        enum: ['daily', 'talent', 'referral'],
      },
    }],
    default: [],
  }
});

export const Points = mongoose.model('Points', pointsSchema);
