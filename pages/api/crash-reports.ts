import { NextApiRequest, NextApiResponse } from "next";
import db from "@/storage/db";
import { getAccount } from "./users/me";
import { pipeline } from "stream/promises";
import { streamJson } from "@/util/json-stream";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "POST":
      handlerPost(req, res);
      break;
    case "GET":
      handlerGet(req, res);
      break;
    default:
      res.status(400).send({});
  }
}

async function handlerPost(req: NextApiRequest, res: NextApiResponse) {
  if (typeof req.body == "string") {
    await db.createBugReport("crash", req.body);
    res.status(200).send(undefined);
  } else {
    res.status(400).send("expecting string");
  }
}

async function handlerGet(req: NextApiRequest, res: NextApiResponse) {
  const account = await getAccount(req, res);

  if (!account || !account.admin) {
    res.status(403).send("Requires admin permission");
    return;
  }

  pipeline(db.listBugReports(), streamJson, res.status(200));
}
