import db from "@/storage/db";
import { NextApiRequest, NextApiResponse } from "next";
import { getAccount } from "../../me";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method == "GET") {
    handleGet(req, res);
    return;
  } else if (req.method == "POST") {
    handlePost(req, res);
  } else {
    res.status(400).send(undefined);
    return;
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  if (typeof req.query.id != "string") {
    res.status(400).send(undefined);
    return;
  }

  const stream = await db.downloadPackagePreview(req.query.id);

  if (!stream) {
    res.status(404).send(undefined);
    return;
  }

  res.status(200).send(stream);
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const account = await getAccount(req, res);

  if (!account) {
    res.status(401).send(undefined);
    return;
  }

  if (typeof req.query.id != "string") {
    res.status(400).send(undefined);
    return;
  }

  await db.uploadPackagePreview(req.query.id, req);

  res.status(200).send(undefined);
}

export const config = {
  api: {
    bodyParser: false,
  },
};
