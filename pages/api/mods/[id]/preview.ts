import db from "@/storage/db";
import { NextApiRequest, NextApiResponse } from "next";
import { getAccount } from "../../users/me";
import { hasEditPermission } from "@/types/package-meta";
import { MAX_PREVIEW_SIZE, restrictUploadSize } from "@/types/limits";

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

  stream.on("error", () => {
    res.status(404).send(undefined);
  });

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

  restrictUploadSize(req, res, MAX_PREVIEW_SIZE);

  try {
    await db.uploadPackagePreview(id, req);

    res.status(200).send(undefined);
  } catch (err) {
    if (!res.closed) {
      throw err;
    }
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
