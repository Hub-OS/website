import { NextApiRequest, NextApiResponse } from "next";
import db, { PackageHashResult } from "@/storage/db";
import { pipeline } from "stream/promises";
import { streamJson } from "@/util/json-stream";

function toStringArray(value?: string | string[]) {
  if (value == undefined) {
    return [];
  }

  if (typeof value == "string") {
    return [value];
  }

  return value;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PackageHashResult[]>
) {
  const ids = toStringArray(req.query.id);

  await pipeline(db.getPackageHashes(ids), streamJson, res.status(200));
}
