import { NextApiRequest, NextApiResponse } from "next";
import { getAccount } from "../../users/me";
import db from "@/storage/db";
import { MemberUpdates, Role } from "@/types/namespace";

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

  const requesterMember = namespace.members.find((member) =>
    db.compareIds(member.id, account.id)
  );

  if (requesterMember?.role != "admin") {
    res.status(403).send("Not an admin");
    return;
  }

  const idString = req.query.id;

  if (typeof idString != "string") {
    res.status(400).send("Missing id");
    return;
  }

  const id = db.stringToId(idString);

  const targetMember = namespace.members.find((member) =>
    db.compareIds(member.id, id)
  );

  switch (req.method) {
    case "POST":
      update.invited.push(id);
      break;
    case "PATCH": {
      const role = req.query.role;

      if (!targetMember || targetMember.role == "invited") {
        res.status(403).send("Role can't be changed until invite is accepted");
        return;
      }

      if (role != "admin" && role != "collaborator") {
        res.status(400).send("Invalid role");
        return;
      }

      update.roleChanges[idString] = role;
      break;
    }
    case "DELETE":
      update.removed.push(id);
      break;
    default:
      res.status(404).send("Unexpected http method");
      return;
  }

  await db.updateNamespaceMembers(prefix, update);
  res.send(undefined);
}
