import { User } from "../models/user";
import { Points } from "../models/points";
export const setDailyPoints = async () => {
  try {
    const users = await User.aggregate([
      { $match: { role: 'user', _id: { $ne: null } } },
      {
        $lookup: {
          from: 'assessments',
          localField: '_id',
          foreignField: 'userId',
          as: 'assessments'
        }
      },
      {
        $lookup: {
          from: 'points',
          localField: '_id',
          foreignField: 'userId',
          as: 'pointsData'
        }
      },
      { $unwind: { path: '$assessments', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$pointsData', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$_id',
          overallScore: { $sum: '$assessments.score' },
          username: { $first: '$username' },
          twitterScore: { $first: '$twitterScore' },
          totalRewardsEarned: { $first: '$totalRewardsEarned' },
          twitterId: { $first: '$twitterId' },
          referredBy: { $first: '$referredBy' },
          points: {
            $sum: {
              $reduce: {
                input: '$pointsData.points',
                initialValue: 0,
                in: { $add: ['$$value', '$$this.point'] }
              }
            }
          }
        }
      },
      { $sort: { twitterScore: -1 } },
      {
        $project: {
          _id: 1,
          username: 1,
          twitterScore: 1,
          totalRewardsEarned: 1,
          overallScore: 1,
          twitterId: 1,
          referredBy: 1,
          points: 1
        }
      }
    ]);
    const topUsers = users.slice(0, 90);
    let referrers: string[] = [];
    await Promise.all(topUsers.map(async (user, index) => {
      if (user.referredBy) {
        referrers = [...referrers, user.referredBy];
      }
      if (index < 10) {
        const findedPoint = await Points.findOne({ userId: user._id });
        if (findedPoint) {
          findedPoint.points.push({ date: new Date(), point: 4000 });
          await findedPoint.save();
        } else {
          const newPoint = new Points({ userId: user._id, points: [{ date: new Date(), point: 4000 }] });
          await newPoint.save();
        }
      } else {
        const findedPoint = await Points.findOne({ userId: user._id });
        if (findedPoint) {
          findedPoint.points.push({ date: new Date(), point: 500 });
          await findedPoint.save();
        } else {
          const newPoint = new Points({ userId: user._id, points: [{ date: new Date(), point: 500 }] });
          await newPoint.save();
        }
      }
    }));
    const referralScore = Math.floor(20000 / referrers.length);
    await Promise.all(referrers.map(async (referrer) => {
      const findedPoint = await Points.findOne({ userId: referrer });
      if (findedPoint) {
        findedPoint.points.push({ date: new Date(), point: referralScore });
        await findedPoint.save();
      } else {
        const newPoint = new Points({ userId: referrer, points: [{ date: new Date(), point: referralScore }] });
        await newPoint.save();
      }
    }));
  } catch (error) {
    console.error(error);
  }

}

export const setRealTimePoints = async () => {
  try {
    await Points.aggregate([
      {
        $addFields: {
          points: {
            $concatArrays: [
              "$points",
              [{
                date: new Date(),
                point: 1
              }]
            ]
          }
        }
      },
      {
        $merge: {
          into: "points",
          whenMatched: "replace"
        }
      }
    ]);
  } catch (error) {
    console.error(error);
  }
}

export const getDailyPoints = async (_req, res) => {


  try {
    const users = await User.aggregate([
      { $match: { role: 'user', _id: { $ne: null } } },
      {
        $lookup: {
          from: 'assessments',
          localField: '_id',
          foreignField: 'userId',
          as: 'assessments'
        }
      },
      {
        $lookup: {
          from: 'points',
          localField: '_id',
          foreignField: 'userId',
          as: 'pointsData'
        }
      },
      { $unwind: { path: '$assessments', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$pointsData', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$_id',
          overallScore: { $sum: '$assessments.score' },
          username: { $first: '$username' },
          twitterScore: { $first: '$twitterScore' },
          totalRewardsEarned: { $first: '$totalRewardsEarned' },
          twitterId: { $first: '$twitterId' },
          referredBy: { $first: '$referredBy' },
          points: {
            $sum: {
              $reduce: {
                input: '$pointsData.points',
                initialValue: 0,
                in: { $add: ['$$value', '$$this.point'] }
              }
            }
          }
        }
      },
      { $sort: { twitterScore: -1 } },
      {
        $project: {
          _id: 1,
          username: 1,
          twitterScore: 1,
          totalRewardsEarned: 1,
          overallScore: 1,
          twitterId: 1,
          referredBy: 1,
          points: 1
        }
      }
    ]);
    const topUsers = users.slice(0, 90);
    let referrers: string[] = [];
    await Promise.all(topUsers.map(async (user, index) => {
      if (user.referredBy) {
        referrers = [...referrers, user.referredBy];
      }
      if (index < 10) {
        const findedPoint = await Points.findOne({ userId: user._id });
        if (findedPoint) {
          findedPoint.points.push({ date: new Date(), point: 4000 });
          await findedPoint.save();
        } else {
          const newPoint = new Points({ userId: user._id, points: [{ date: new Date(), point: 4000 }] });
          await newPoint.save();
        }
      } else {
        const findedPoint = await Points.findOne({ userId: user._id });
        if (findedPoint) {
          findedPoint.points.push({ date: new Date(), point: 500 });
          await findedPoint.save();
        } else {
          const newPoint = new Points({ userId: user._id, points: [{ date: new Date(), point: 500 }] });
          await newPoint.save();
        }
      }
    }));
    const referralScore = Math.floor(20000 / referrers.length);
    await Promise.all(referrers.map(async (referrer) => {
      const findedPoint = await Points.findOne({ userId: referrer });
      if (findedPoint) {
        findedPoint.points.push({ date: new Date(), point: referralScore });
        await findedPoint.save();
      } else {
        const newPoint = new Points({ userId: referrer, points: [{ date: new Date(), point: referralScore }] });
        await newPoint.save();
      }
    }));
    res.status(200).json(topUsers);
  } catch (error) {
    res.status(500).json({ message: error });
    console.error(error);
  }
}

export const getRealTimePoints = async (_req, res) => {
  try {
    const points = await Points.aggregate([
      {
        $addFields: {
          points: {
            $concatArrays: [
              "$points",
              [{
                date: new Date(),
                point: 1
              }]
            ]
          }
        }
      },
      {
        $merge: {
          into: "points",
          whenMatched: "replace"
        }
      }
    ]);
    res.status(200).json(points);
  } catch (error) {
    res.status(500).json({ message: error });
    console.error(error);
  }

}
