import { NextApiRequest, NextApiResponse } from "next";
import db, { PackageHashResult } from "@/storage/db";
import { pipeline } from "stream/promises";

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

  const streamIn = db.getPackageHashes(ids);

  await pipeline(
    streamIn,
    // stream JSON array to avoid storing all results in memory
    async function* (source) {
      let next;

      for await (const chunk of source) {
        if (next) {
          yield next + ",";
        } else {
          yield "[";
        }

        next = JSON.stringify(chunk);
      }

      if (!next) {
        next = "[";
      }

      yield next + "]";
    },
    res.status(200)
  );
}
