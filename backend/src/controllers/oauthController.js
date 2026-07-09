import { generators } from "openid-client";
import { getClient } from "../../auth/oidc.js";
import prisma from "../../db.js";
import crypto from "crypto";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../utils/token.js";

export const googleRedirect = async (req, res) => {
  const client = await getClient();
  const state = generators.state();
  const nonce = generators.nonce();
  req.session.state = state;
  req.session.nonce = nonce;

  const url = client.authorizationUrl({
    scope: "openid email profile",
    state,
    nonce,
  });
  res.redirect(url);
};

export const googleCallback = async (req, res) => {
  const client = await getClient();
  const params = client.callbackParams(req);
  const tokenSet = await client.callback(
    process.env.GOOGLE_CALLBACK_URL,
    params,
    { state: req.session.state, nonce: req.session.nonce },
  );

  const claims = tokenSet.claims();
  const familyId = crypto.randomBytes(16).toString("hex");

  let user = await prisma.user.findUnique({ where: { email: claims.email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: claims.name || claims.email.split("@")[0],
        email: claims.email,
        googleId: claims.sub,
        password: "", // adjust: if your schema requires password, see note below
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
