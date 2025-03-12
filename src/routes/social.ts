import env from "@/config/env";
// import { auth } from '@/middleware/auth';
import express from "express";
import passport from "@/config/passport";
import type { JwtPayload } from "jsonwebtoken";
import { verifyAccessToken } from "@/controllers/social";

const router = express.Router();

// Twitter
router.get("/twitter", verifyAccessToken, async (req, res, next) => {
  const user = req.user;
  // eslint-disable-next-line
  // @ts-ignore:next-line
  req.session.userId = (user as JwtPayload)._id;
  console.log("req.session", req.session);
  return passport.authenticate("twitter", {
    scope: ["tweet.read", "users.read", "offline.access"],
    failWithError: true,
  })(req, res, next);
});

router.get(
  "/twitter/callback",
  passport.authenticate("twitter", {
    failureRedirect: `${env.CLIENT_BASE_URL}/assessments?socialAuthFailed=true&provider=twitter`,
    failureMessage: true,
  }),
  (req, res) => {
    console.log(req.authInfo);
    console.log(res);
    return res.redirect(
      `${env.CLIENT_BASE_URL}/assessments?socialAuthSuccess=true&provider=twitter`,
    );
  },
);




export default router;
