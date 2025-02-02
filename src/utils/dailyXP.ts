import { User } from "../models/user";
export const setDailyXP = async (_req, res) => {
  try{
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
      { $unwind: { path: '$assessments', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$_id',
          overallScore: { $sum: '$assessments.score' },
          username: { $first: '$username' },
          twitterScore: { $first: '$twitterScore' },
          totalRewardsEarned: { $first: '$totalRewardsEarned' },
          twitterId: { $first: '$twitterId' },
          referredBy: { $first: '$referredBy' },
          xp: { $first: '$xp' }
        }
      },
      { $sort: { overallScore: -1, twitterScore: -1 } },
      {
        $project: {
          _id: 1,
          username: 1,
          twitterScore: 1,
          totalRewardsEarned: 1,
          overallScore: 1,
          twitterId: 1,
          referredBy: 1,
          xp: 1
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
        const userfinded = await User.findById(user._id);
        userfinded!.xp = userfinded!.xp + 4000;
        console.log(userfinded);
        await userfinded!.save();
      } else {
        const userfinded = await User.findById(user._id);
        userfinded!.xp = userfinded!.xp + 500;
        await userfinded!.save();
      }
    }));
    const referralScore = Math.floor(20000 / referrers.length);
    await Promise.all(referrers.map(async (referrer) => {
      const userfinded = await User.findById(referrer);
      userfinded!.xp = userfinded!.xp + referralScore;
      await userfinded!.save();
    }));
    console.log(referralScore);
    return res.status(200).json(topUsers);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
