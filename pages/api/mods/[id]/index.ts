import db from "@/storage/db";
import { NextApiRequest, NextApiResponse } from "next";
import { getAccount } from "../../users/me";
import { hasEditPermission } from "@/types/package-meta";
import { MAX_PACKAGE_SIZE, restrictUploadSize } from "@/types/limits";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method == "GET") {
    await handleGet(req, res);
  } else if (req.method == "POST") {
    await handlePost(req, res);
  } else if (req.method == "DELETE") {
    await handleDelete(req, res);
  } else {
    res.status(400).send(undefined);
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  if (typeof req.query.id != "string") {
    res.status(400).send(undefined);
    return;
  }

  const stream = await db.downloadPackageZip(req.query.id);

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

  const id = req.query.id;

  if (typeof id != "string") {
    res.status(400).send(undefined);
    return;
  }

  const meta = await db.findPackageMeta(id);

  if (!meta) {
    res.status(404).send(undefined);
    return;
  }

  if (!(await hasEditPermission(db, meta, account.id))) {
    res.status(403).send(undefined);
    return;
  }

  restrictUploadSize(req, res, MAX_PACKAGE_SIZE);

  try {
    await db.uploadPackageZip(id, req);

    res.status(200).send(undefined);
  } catch (err) {
    if (!res.closed) {
      throw err;
    }
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const account = await getAccount(req, res);

  if (!account) {
    res.status(401).send(undefined);
    return;
  }

  const id = req.query.id;

  if (typeof id != "string") {
    res.status(400).send(undefined);
    return;
  }

  const meta = await db.findPackageMeta(id);

  if (!meta) {
    res.status(404).send(undefined);
    return;
  }

  if (!account.admin && !(await hasEditPermission(db, meta, account.id))) {
    res.status(403).send(undefined);
    return;
  }

  await db.deletePackage(id);

  res.status(200).send(undefined);
}

export const config = {
  api: {
    bodyParser: false,
  },
};
