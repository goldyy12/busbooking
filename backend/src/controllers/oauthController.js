import * as client from "openid-client";
import { getConfig } from "../../auth/oidc.js";
import prisma from "../../db.js";
import crypto from "crypto";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../utils/token.js";

export const googleRedirect = async (req, res) => {
  const config = await getConfig();

  const code_verifier = client.randomPKCECodeVerifier();
  const code_challenge = await client.calculatePKCECodeChallenge(code_verifier);
  const state = client.randomState();
  const nonce = client.randomNonce();

  req.session.code_verifier = code_verifier;
  req.session.state = state;
  req.session.nonce = nonce;

  const redirectTo = client.buildAuthorizationUrl(config, {
    redirect_uri: process.env.GOOGLE_CALLBACK_URL,
    scope: "openid email profile",
    code_challenge,
    code_challenge_method: "S256",
    state,
    nonce,
  });

  res.redirect(redirectTo.href);
};

export const googleCallback = async (req, res) => {
  const config = await getConfig();

  const currentUrl = new URL(req.originalUrl, process.env.GOOGLE_CALLBACK_URL);

  const tokens = await client.authorizationCodeGrant(config, currentUrl, {
    pkceCodeVerifier: req.session.code_verifier,
    expectedState: req.session.state,
    expectedNonce: req.session.nonce,
  });

  const claims = tokens.claims();
  const familyId = crypto.randomBytes(16).toString("hex");

  let user = await prisma.user.findUnique({ where: { email: claims.email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: claims.name || claims.email.split("@")[0],
        email: claims.email,
        googleId: claims.sub,
        password: crypto.randomBytes(32).toString("hex"),
      },
    });
  } else if (!user.googleId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId: claims.sub },
    });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user, familyId);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${accessToken}`);
};
