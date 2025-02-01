import passport from 'passport';
import { Strategy as InstagramStrategy } from 'passport-instagram';
import env from '@/config/env';

passport.use(
  new InstagramStrategy(
    {
      clientID: env.INSTAGRAM_CLIENT_ID,
      clientSecret: env.INSTAGRAM_CLIENT_SECRET,
      callbackURL: `${env.API_BASE_URL}/social/instagram/callback`,
    },
    function (_accessToken, _refreshToken, profile, done) {
      return done(null, profile);
    },
  ),
);
