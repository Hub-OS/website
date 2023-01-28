import discord from "discord.js";
import { getCookie } from "cookies-next";
import { NextApiRequest, NextApiResponse } from "next";

type DiscordUser = {
  id: string; // the user's id
  username: string; // the user's username, not unique across the platform
  discriminator: string; // the user's 4-digit discord-tag
  avatar?: string; // the user's avatar hash
};

export async function fetchDiscordUser(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const token = getCookie("token", { req, res });

  if (typeof token != "string") {
    return;
  }

  const rest = new discord.REST({ version: "10", authPrefix: "Bearer" });
  rest.setToken(token);

  return (await rest.get(discord.Routes.user())) as DiscordUser;
}
