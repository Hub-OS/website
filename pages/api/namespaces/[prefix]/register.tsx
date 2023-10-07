import { NextApiRequest, NextApiResponse } from "next";
import db from "@/storage/db";
import { Query } from "@/types/query";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const prefix = req.query.prefix;

  if (typeof prefix != "string") {
    res.status(400).send(undefined);
    return;
  }

  const namespace = await db.findNamespace(prefix);

  if (!namespace) {
    res.status(404).send("Namespace not found");
    return;
  }

  const query: Query = {
    "^package.id": prefix,
    "!creator": namespace.members
      .filter((member) => member.role != "invited")
      .map((member) => member.id),
  };

  const [meta] = await db.listPackages(query, null, 0, 1);

  if (meta) {
    const message = `Blocked by ${meta.package.name} (${meta.package.id})`;
    res.status(400).send(message);
    return;
  }

  await db.registerNamespace(prefix);

  res.send(undefined);
}
