import db from "@/storage/db";
import { PublicAccountData } from "@/types/public-account-data";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PublicAccountData | undefined>
) {
  if (req.method != "GET") {
    res.status(400).send(undefined);
    return;
  }

  const username = req.query.name;

  if (typeof username != "string") {
    res.status(400).send(undefined);
    return;
  }

  const account = await db.findAccountByName(username);

  if (!account) {
    res.status(404).send(undefined);
    return;
  }

  res.status(200).json({
    id: account.id,
    username: account.username,
    avatar: account.avatar,
  });
}
