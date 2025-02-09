import env from '@/config/env';
import { User } from '@/models/user';
import passport from 'passport';
import { Strategy as TwitterStrategy } from '@superfaceai/passport-twitter-oauth2';
import { twitterVerify } from '@/utils/twitterVerify';
import { Notification } from '@/models/notification';
import { getSocketIO } from '@/config/socket-io';

passport.use(
  new TwitterStrategy(
    {
      clientID: env.TWITTER_CONSUMER_KEY,
      clientSecret: env.TWITTER_CONSUMER_SECRET,
      clientType: 'confidential',
      callbackURL: `${env.API_BASE_URL}/social/twitter/callback`,
      passReqToCallback: true,
    },
    async function (req, _accessToken, _refreshToken, profile, cb) {
      console.log(profile, 'query', req.query, req.session);
      console.log("username", profile.username);
      try {
        const userId = req.session?.userId;

        const user = await User.findById(userId);

        if (!user) return cb(new Error('User not found'), null);

        const existing = await User.findOne({ twitterId: profile.id });
        if (existing) return cb(new Error('This Twitter account is already linked'), null);
        user.twitterId = profile.id;
        const verifyScore = await twitterVerify(profile.username);
        user.verified = true;
        user.twitterScore = verifyScore;
        await user.save();
        if (user.verified) {
          const notification = new Notification({
            userId: userId,
            message: 'You are verified, you can now claim rewards.',
            type: 'user-verified',
          });
          await notification.save();
          const io = getSocketIO();
          io.to(userId).emit('notification', notification);
        }
        return cb(null, user);
      } catch (error) {
        return cb(error, null);
      }
    },
  ),
);
