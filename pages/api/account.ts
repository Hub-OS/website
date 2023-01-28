import discord from "discord.js";
import { NextApiRequest, NextApiResponse } from "next";
import { getCookie } from "cookies-next";
import { PublicAccountData } from "@/types/public-account-data";

type DiscordUser = {
  id: string; // the user's id
  username: string; // the user's username, not unique across the platform
  discriminator: string; // the user's 4-digit discord-tag
  avatar?: string; // the user's avatar hash
};

async function fetchDiscordUser(req: NextApiRequest, res: NextApiResponse) {
  const token = getCookie("token", { req, res });

  if (typeof token != "string") {
    return;
  }

  const rest = new discord.REST({ version: "10", authPrefix: "Bearer" });
  rest.setToken(token);

  return (await rest.get(discord.Routes.user())) as DiscordUser;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PublicAccountData | undefined>
) {
  if (req.method != "GET") {
    res.status(400).send(undefined);
    return;
  }

  const user = await fetchDiscordUser(req, res);

  if (!user) {
    res.status(401).send(undefined);
    return;
  }

  res.status(200).json({
    username: user.username,
    avatar:
      user.avatar != undefined
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}?size=128`
        : `https://cdn.discordapp.com/embed/avatars/${
            +user.discriminator % 5
          }.png?size=128`,
  });
}
