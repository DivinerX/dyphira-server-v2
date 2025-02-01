import passport from 'passport';
import { Strategy as RedditStrategy } from 'passport-reddit';
import env from '@/config/env';

passport.use(
  new RedditStrategy(
    {
      clientID: env.REDDIT_CONSUMER_KEY,
      clientSecret: env.REDDIT_CONSUMER_SECRET,
      callbackURL: `${env.API_BASE_URL}/social/reddit/callback`,
    },
    function (_accessToken, _refreshToken, profile, done) {
      return done(null, profile);
    },
  ),
);
