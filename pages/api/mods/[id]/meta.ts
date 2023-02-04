import { NextApiRequest, NextApiResponse } from "next";
import { asPackageMeta, PackageMeta } from "@/types/package-meta";
import db from "@/storage/db";
import { getAccount } from "../../users/me";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method == "GET") {
    await handleGet(req, res);
  } else if (req.method == "POST") {
    await handlePost(req, res);
  } else {
    res.status(400).send(undefined);
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<PackageMeta | undefined>
) {
  const meta = await db.findPackageMeta(req.query.id as string);

  if (!meta) {
    res.status(404).send(undefined);
    return;
  }

  res.status(200).send(meta);
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<PackageMeta | undefined>
) {
  const account = await getAccount(req, res);

  if (!account) {
    res.status(401).send(undefined);
    return;
  }

  const meta = asPackageMeta(req.body.meta);

  if (!meta || meta.package.id != req.query.id) {
    res.status(400).send(undefined);
    return;
  }

  const matchingMeta = await db.findPackageMeta(meta.package.id as string);

  if (matchingMeta) {
    if (!db.compareIds(matchingMeta.creator, account.id)) {
      res.status(403).send(undefined);
      return;
    }

    meta.creation_date = matchingMeta.creation_date;
  } else {
    meta.creation_date = new Date();
  }

  meta.creator = account.id;
  meta.updated_date = new Date();

  await db.upsertPackageMeta(meta);

  res.status(200).send(meta);
}
