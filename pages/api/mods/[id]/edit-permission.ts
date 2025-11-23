import db from "@/storage/db";
import { NextApiRequest, NextApiResponse } from "next";
import { getAccount } from "../../users/me";
import { hasEditPermission } from "@/util/package-meta";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method == "GET") {
    await handleGet(req, res);
  } else {
    res.status(400).send(undefined);
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  if (typeof req.query.id != "string") {
    res.status(400).send(false);
    return;
  }

  const meta = await db.findPackageMeta(req.query.id);

  if (!meta) {
    res.status(404).send(false);
    return;
  }

  const account = await getAccount(req, res);

  if (!account) {
    res.status(401).send(false);
    return;
  }

  const hasPermission = await hasEditPermission(db, meta, account.id);

  res.send(hasPermission);
}
