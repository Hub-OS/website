import { NextApiRequest, NextApiResponse } from "next";
import { setCookie } from "cookies-next";
import { fetchDiscordUser } from "@/types/discord";
import db from "@/storage/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method != "POST") {
    res.status(400).send({});
    return;
  }

  const token = req.body?.token;
  setCookie("token", token, {
    req,
    res,
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
  });

  const discordUser = await fetchDiscordUser(req, res);

  if (!discordUser) {
    res.status(400).send(undefined);
    return;
  }

  const account = await db.findAccountByDiscordId(discordUser.id);

  if (!account) {
    const username = discordUser.username + "@discord";

    // create an account
    await db.createAccount({
      username,
      normalized_username: username.toLowerCase(),
      discord_id: discordUser.id,
      avatar:
        discordUser.avatar != undefined
          ? `https://cdn.discordapp.com/avatars/${discordUser.id}?size=128`
          : `/default-avatar.png`,
    });
  }

  res.status(200).send(undefined);
}
