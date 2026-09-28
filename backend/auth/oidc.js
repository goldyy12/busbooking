import * as client from "openid-client";

let config;

export async function getConfig() {
  if (config) return config;
  config = await client.discovery(
    new URL("https://accounts.google.com"),
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  return config;
}
