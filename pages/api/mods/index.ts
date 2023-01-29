import { NextApiRequest, NextApiResponse } from "next";
import { PackageMeta } from "@/types/package-meta";
import db from "@/storage/db";
import { Query } from "@/types/query";
import { SortMethod } from "@/types/sort-method";

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

const mods_per_page = 10;

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<PackageMeta[] | undefined>
) {
  if (typeof req.query.page != "string") {
    res.status(400).send(undefined);
    return;
  }

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
