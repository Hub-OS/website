import { NextApiRequest, NextApiResponse } from "next";
import { getAccount } from "../users/me";
import db from "@/storage/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method != "GET") {
    res.status(400).send(undefined);
    return;
  }

  const account = await getAccount(req, res);

  if (!account) {
    res.send([]);
    return;
  }

  const namespaces = await db.findMemberOrInvitedNamespaces(account.id);

  res.send(namespaces);
}
