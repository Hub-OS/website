import { NextApiRequest, NextApiResponse } from "next";
import { asPackageMeta, PackageMeta } from "@/types/package-meta";
import db from "@/storage/db";
import { Query } from "@/types/query";
import { SortMethod } from "@/types/sort-method";
import { getAccount } from "../me";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method == "POST") {
    return handlePost(req, res);
  }
  if (req.method == "GET") {
    return handleGet(req, res);
  } else {
    res.status(400).send(undefined);
    return;
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  if (typeof req.query.id == "string") {
    return handleFindPackageRequest(req, res);
  } else if (typeof req.query.page == "string") {
    return handlePageRequest(req, res);
  } else {
    res.status(400).send(undefined);
  }
}

async function handleFindPackageRequest(
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

const mods_per_page = 10;

async function handlePageRequest(
  req: NextApiRequest,
  res: NextApiResponse<PackageMeta[] | undefined>
) {
  let page = Math.floor(+(req.query.page as string));

  if (page < 0 || page == Infinity) {
    page = 0;
  }

  const query: Query = {};

  if (req.query.category) {
    query["package.category"] = req.query.category;
  }

  const skip = page * mods_per_page;
  const list = await db.listPackages(
    query,
    SortMethod.CreationDate,
    skip,
    mods_per_page
  );

  res.status(200).send(list);
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  if (req.headers["content-type"] == "application/json") {
    await handlePackageMetaPost(req, res);
  } else {
    res.status(400).send(undefined);
  }
}

async function handlePackageMetaPost(
  req: NextApiRequest,
  res: NextApiResponse<PackageMeta | undefined>
) {
  const account = await getAccount(req, res);

  if (!account) {
    res.status(401).send(undefined);
    return;
  }

  const meta = asPackageMeta(req.body.meta);

  if (!meta) {
    res.status(400).send(undefined);
    return;
  }

  const matchingMeta = await db.findPackageMeta(req.query.id as string);

  if (matchingMeta) {
    if (matchingMeta.creator != account.id) {
      res.status(404).send(undefined);
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
