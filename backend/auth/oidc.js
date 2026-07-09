// auth/oidc.js
import { Issuer } from "openid-client";

let client;
async function getClient() {
  if (client) return client;
  const googleIssuer = await Issuer.discover("https://accounts.google.com");
  client = new googleIssuer.Client({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uris: ["http://localhost:5000/auth/google/callback"],
    response_types: ["code"],
  });
  return client;
}
module.exports = { getClient };
