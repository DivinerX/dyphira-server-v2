import passport from 'passport';
import '@/strategies/facebookStrategy';
import '@/strategies/twitterStrategy';
// import '@/strategies/redditStrategy';
import '@/strategies/linkedinStrategy';
import '@/strategies/instagramStrategy';
import type { IUser } from '../models/user';

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser(async (user, done) => {
  try {
    done(null, user as IUser);
  } catch (error) {
    done(error);
  }
});

export default passport;
