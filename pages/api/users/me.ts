import { NextApiRequest, NextApiResponse } from "next";
import { PublicAccountData } from "@/types/public-account-data";
import { fetchDiscordUser } from "@/types/discord";
import db from "@/storage/db";

export async function getAccount(req: NextApiRequest, res: NextApiResponse) {
  const discordUser = await fetchDiscordUser(req, res);

  if (!discordUser) {
    return;
  }

  const account = await db.findAccountByDiscordId(discordUser.id);

  if (!account) {
    return;
  }

  return account;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PublicAccountData | undefined>
) {
  if (req.method != "GET") {
    res.status(400).send(undefined);
    return;
  }

  const account = await getAccount(req, res);

  if (!account) {
    res.status(401).send(undefined);
    return;
  }

  res.status(200).json({
    id: account.id,
    username: account.username,
    avatar: account.avatar,
  });
}
