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

  let id;

  if (typeof req.query.id == "string") {
    id = db.stringToId(req.query.id);
  }

  if (!id) {
    const account = await getAccount(req, res);

    if (!account) {
      res.send([]);
      return;
    }

    id = account.id;
  }

  const namespaces = await db.findMemberOrInvitedNamespaces(id);

  res.send(namespaces);
}
