import { NextApiRequest, NextApiResponse } from "next";

const KiB = 1024;
const MiB = 1024 * KiB;

export const MAX_PACKAGE_SIZE = 5 * MiB;
export const MAX_PREVIEW_SIZE = 10 * KiB;
export const MAX_NEW_DAILY_UPLOADS = 150;

export function restrictUploadSize(
  req: NextApiRequest,
  res: NextApiResponse,
  limit: number
) {
  let size = 0;

  req.on("data", (chunk: Buffer) => {
    size += chunk.length;

    if (size > limit) {
      res.status(400).send("Exceeded package size limit");
      req.destroy();
    }
  });
}
