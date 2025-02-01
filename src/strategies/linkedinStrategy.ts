import passport from 'passport';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import env from '@/config/env';
import { User } from '@/models/user';
import { JwtPayload } from 'jsonwebtoken';

passport.use(
  new LinkedInStrategy(
    {
      clientID: env.LINKEDIN_KEY,
      clientSecret: env.LINKEDIN_SECRET,
      callbackURL: `${env.API_BASE_URL}/social/linkedin/callback`,
      scope: ['profile', 'email', 'openid'],
      passReqToCallback: true,
    },
    async function (req, _accessToken, _refreshToken, profile, cb) {
      console.log(profile, req.query);

      try {
        const userId = (req.user as JwtPayload)._id;

        const user = await User.findById(userId);

        if (!user) return cb(new Error('User not found'), null);

        user.linkedinId = profile?.id;
        await user.save();

        return cb(null, user);
      } catch (error) {
        return cb(error, null);
      }
    },
  ),
);
