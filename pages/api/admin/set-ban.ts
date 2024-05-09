import db from "@/storage/db";
import {
  PublicAccountData,
  intoPublicAccount,
} from "@/types/public-account-data";
import { NextApiRequest, NextApiResponse } from "next";
import { getAccount } from "../users/me";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PublicAccountData | string>
) {
  const account = await getAccount(req, res);

  if (!account || !account.admin) {
    res.status(403).send("Not an admin");
    return;
  }

  let id = db.stringToId(req.query.id as string);

  // ban / unban
  const banning = req.query.ban != "false";
  await db.patchAccount(id, { banned: banning });

  const updatedUser = await db.findAccountById(id);

  if (!updatedUser) {
    res.status(400).send("No account with that id");
    return;
  }

  res.status(200).send(intoPublicAccount(updatedUser));
}
