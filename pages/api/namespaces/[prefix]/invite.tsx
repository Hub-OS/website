import { NextApiRequest, NextApiResponse } from "next";
import { getAccount } from "../../users/me";
import db from "@/storage/db";
import { MemberUpdates, Role } from "@/util/namespace";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const prefix = req.query.prefix;

  if (typeof prefix != "string") {
    res.status(400).send(undefined);
    return;
  }

  const account = await getAccount(req, res);

  if (!account) {
    res.status(403).send("Not logged in");
    return;
  }

  const namespace = await db.findNamespace(prefix);

  if (!namespace) {
    res.status(404).send("Namespace not found");
    return;
  }

  const update: MemberUpdates = {
    invited: [],
    removed: [],
    roleChanges: {},
  };

  const member = namespace.members.find((member) =>
    db.compareIds(member.id, account.id)
  );

  if (!member) {
    res.status(403).send("Not invited");
    return;
  }

  switch (req.method) {
    case "POST": {
      if (member?.role != "admin" && !account.admin) {
        res.status(403).send("Not a namespace admin");
        return;
      }

      const id = req.query.id;

      if (typeof id != "string") {
        res.status(400).send("Missing id");
        return;
      }

      update.invited.push(db.stringToId(id));
      break;
    }
    case "PATCH": {
      const idString = db.idToString(account.id);
      update.roleChanges[idString] = "collaborator" as Role;
      break;
    }
    case "DELETE":
      update.removed.push(account.id);
      break;
    default:
      res.status(404).send("Unexpected http method");
      return;
  }

  await db.updateNamespaceMembers(prefix, update);
  res.send(undefined);
}
