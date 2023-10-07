import { NextApiRequest, NextApiResponse } from "next";
import {
  asPackageMeta,
  hasEditPermission,
  PackageMeta,
} from "@/types/package-meta";
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
  } else if (req.method == "PATCH") {
    await handlePatch(req, res);
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

  const ids = [meta.package.id];

  if (meta.package.past_ids) {
    ids.push(...meta.package.past_ids);
  }

  const matchingMetas = await db.findPackageMetas(ids);
  const permissionChecks = await Promise.all(
    matchingMetas.map((meta) => hasEditPermission(db, meta, account.id))
  );

  if (permissionChecks.some((permitted) => !permitted)) {
    // we don't have permission to update every package
    res.status(403).send(undefined);
    return;
  }

  const matchingIdExists = matchingMetas.some(
    (m) => m.package.id == meta.package.id
  );

  if (!matchingIdExists) {
    // make sure we have namespace permission
    if (!(await hasEditPermission(db, meta, account.id))) {
      res.status(403).send(undefined);
      return;
    }

    // new package, init
    meta.hidden = false;
    meta.creator = account.id;
  }

  // enforcing uniqueness
  if (matchingMetas.some((m) => m.package.id != meta.package.id)) {
    await db.deletePackages(matchingMetas.map((meta) => meta.package.id));
  }

  await db.upsertPackageMeta(meta);

  res.status(200).send(meta);
}

const patchWhitelist = ["hidden"];

async function handlePatch(req: NextApiRequest, res: NextApiResponse) {
  const account = await getAccount(req, res);

  if (!account) {
    res.status(401).send(undefined);
    return;
  }

  // validate patch
  const patch = req.body;

  if (typeof patch != "object") {
    res.status(400).send(undefined);
    return;
  }

  for (const key in patch) {
    if (!patchWhitelist.includes(key)) {
      res.status(400).send(undefined);
      return;
    }
  }

  // get package meta
  const id = req.query.id;

  if (typeof id != "string") {
    res.status(400).send(undefined);
    return;
  }

  const meta = await db.findPackageMeta(id);

  // verify existence
  if (!meta) {
    res.status(404).send(undefined);
    return;
  }

  // verify permission
  if (!(await hasEditPermission(db, meta, account.id))) {
    res.status(403).send(undefined);
    return;
  }

  await db.patchPackageMeta(id, patch);

  res.status(200).send(meta);
}
