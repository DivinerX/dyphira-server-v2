import env from '@/config/env';
import { User } from '@/models/user';
import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';

passport.use(
  new FacebookStrategy(
    {
      clientID: env.FACEBOOK_APP_ID,
      clientSecret: env.FACEBOOK_APP_SECRET,
      callbackURL: `${env.API_BASE_URL}/social/facebook/callback`,
      profileFields: [
        'id',
        'displayName',
        'name',
        'picture',
        'email',
        'profileUrl',
      ],
      passReqToCallback: true,
    },
    async function (req, _accessToken, _refreshToken, profile, cb) {
      console.log(profile);

      try {
        const userId = req.query.state;

        const user = await User.findById(userId);

        if (!user) return cb(new Error('User not found'), null);

        user.facebookId = profile.id;
        await user.save();

        return cb(null, user);
      } catch (error) {
        return cb(error, null);
      }
    },
  ),
);

export default passport;
