import env from "@/config/env";
// import { auth } from '@/middleware/auth';
import express from "express";
import axios from "axios";
import { randomBytes } from "crypto";
import passport from "@/config/passport";
import type { JwtPayload } from "jsonwebtoken";
import { verifyAccessToken } from "@/controllers/social";
import { User } from "@/models/user";

const router = express.Router();

router.get("/facebook", verifyAccessToken, async (req, res, next) => {
  const user = req.user;

  return passport.authenticate("facebook", {
    state: (user as JwtPayload)._id,
  })(req, res, next);
});

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    failureRedirect: `${env.CLIENT_BASE_URL}/assessments?socialAuthFailed=true&provider=facebook`,
    failureMessage: true,
  }),
  (req, res) => {
    console.log(req.authInfo);
    return res.redirect(
      `${env.CLIENT_BASE_URL}/assessments?socialAuthSuccess=true&provider=facebook`,
    );
  },
);

// Reddit
router.get("/reddit", verifyAccessToken, async (req, res, next) => {
  const user = req.user;

  return passport.authenticate("reddit", {
    state: (user as JwtPayload)._id,
  })(req, res, next);
});

router.get(
  "/reddit/callback",
  passport.authenticate("reddit", {
    failureRedirect: `${env.CLIENT_BASE_URL}/assessments?socialAuthFailed=true&provider=reddit`,
    failureMessage: true,
  }),
  (req, res) => {
    console.log(req.authInfo);
    return res.redirect(
      `${env.CLIENT_BASE_URL}/assessments?socialAuthSuccess=true&provider=reddit`,
    );
  },
);

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

// LinkedIn
router.get("/linkedin", verifyAccessToken, async (req, res, next) => {
  // eslint-disable-next-line
  // @ts-ignore:next-line
  req.session.userId = (req.user as JwtPayload)._id;

  return passport.authenticate("linkedin")(req, res, next);
});

router.get(
  "/linkedin/callback",
  passport.authenticate("linkedin", {
    failureRedirect: `${env.CLIENT_BASE_URL}/assessments?socialAuthFailed=true&provider=linkedin`,
    failureMessage: true,
  }),
  (req, res) => {
    console.log(req.authInfo);
    return res.redirect(
      `${env.CLIENT_BASE_URL}/assessments?socialAuthSuccess=true&provider=linkedin`,
    );
  },
);

// Instagram
router.get("/instagram", verifyAccessToken, async (req, res, next) => {
  // eslint-disable-next-line
  // @ts-ignore:next-line
  req.session.userId = (req.user as JwtPayload)._id;

  return passport.authenticate("instagram", {})(req, res, next);
});

router.get(
  "/instagram/callback",
  passport.authenticate("instagram", {
    failureRedirect: `${env.CLIENT_BASE_URL}/assessments?socialAuthFailed=true&provider=instagram`,
    failureMessage: true,
  }),
  (req, res) => {
    console.log(req.authInfo);
    return res.redirect(
      `${env.CLIENT_BASE_URL}/assessments?socialAuthSuccess=true&provider=instagram`,
    );
  },
);

// router.get('/worldid', verifyAccessToken, async (req, res, next) => {
//   // eslint-disable-next-line
//   // @ts-ignore:next-line
//   req.session.userId = (req.user as JwtPayload)._id;
// });

const REDIRECT_URI = `${env.API_BASE_URL}/social/worldid/callback`;

router.get("/worldid", verifyAccessToken, (req, res) => {
  const state = randomBytes(16).toString("hex");
  // eslint-disable-next-line
  // @ts-ignore:next-line
  req.session.state = state;
  // eslint-disable-next-line
  // @ts-ignore:next-line
  req.session.userId = (req.user as JwtPayload)._id;
  const authUrl = `https://id.worldcoin.org/authorize?client_id=${env.WORLDID_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=openid%20profile%20email&state=${state}`;
  return res.redirect(authUrl);
});

router.get("/social/worldid/callback", async (req, res) => {
  const { code, state } = req.query;

  // eslint-disable-next-line
  // @ts-ignore:next-line
  if (state !== req.session.state) {
    return res.status(403).send("State mismatch");
  }

  try {
    const tokenResponse = await axios.post(
      "https://id.worldcoin.org/oauth/token",
      {
        client_id: env.WORLDID_CLIENT_ID,
        client_secret: env.WORLDID_CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      },
    );

    const { id_token } = tokenResponse.data;

    const profileResponse = await axios.get(
      "https://id.worldcoin.org/userinfo",
      {
        headers: {
          Authorization: `Bearer ${id_token}`,
        },
      },
    );

    const profile = profileResponse.data;
    // eslint-disable-next-line
    // @ts-ignore:next-line
    const userId = req.session?.userId;

    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.worldidId = profile?.id;
    await user.save();

    return res.redirect(
      `${env.CLIENT_BASE_URL}/assessments?socialAuthSuccess=true&provider=worldid`,
    );
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Authentication failed" });
  }
});

export default router;
