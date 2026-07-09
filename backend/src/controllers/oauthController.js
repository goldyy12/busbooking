import { generators } from "openid-client";
import { getClient } from "../../auth/oidc.js";
import prisma from "../../db.js"; //// adjust to however you export your prisma client
const { generate, signRefreshToken } = require("../../utils"); // adjust path to your existing JWT helpers

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

  let user = await prisma.user.findUnique({ where: { email: claims.email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: claims.email,
        name: claims.name,
        googleId: claims.sub,
      },
    });
  } else if (!user.googleId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId: claims.sub },
    });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${accessToken}`);
};
