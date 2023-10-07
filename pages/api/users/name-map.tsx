import db from "@/storage/db";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const idStrings = req.body.ids as string[];
  const ids = idStrings.map((id) => db.stringToId(id));

  res.json(await db.createAccountNameMap(ids));
}
