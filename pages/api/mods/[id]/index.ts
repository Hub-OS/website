import db from "@/storage/db";
import { NextApiRequest, NextApiResponse } from "next";
import { getAccount } from "../../me";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method != "POST") {
    res.status(400).send(undefined);
    return;
  }

  const account = await getAccount(req, res);

  if (!account) {
    res.status(401).send(undefined);
    return;
  }

  if (typeof req.query.id != "string") {
    res.status(400).send(undefined);
    return;
  }

  await db.uploadPackageZip(req.query.id, req);

  res.status(200).send(undefined);
}

export const config = {
  api: {
    bodyParser: false,
  },
};
