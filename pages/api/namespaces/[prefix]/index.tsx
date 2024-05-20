import { NextApiRequest, NextApiResponse } from "next";
import { getAccount } from "../../users/me";
import db from "@/storage/db";
import { MemberUpdates, Namespace, SYMBOL_REGEX } from "@/types/namespace";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const prefix = req.query.prefix;

  if (typeof prefix != "string") {
    res.status(400).send(undefined);
    return;
  }

  if (req.method == "GET") {
    await handleGet(res, prefix);
  } else if (req.method == "POST") {
    await handlePost(req, res, prefix);
  } else if (req.method == "PATCH") {
    await handlePatch(req, res, prefix);
  } else if (req.method == "DELETE") {
    await handleDelete(req, res, prefix);
  } else {
    res.status(400).send(undefined);
  }
}

async function handleGet(res: NextApiResponse, prefix: string) {
  const namespace = await db.findNamespace(prefix);

  if (!namespace) {
    res.status(404).send(undefined);
    return;
  }

  res.send(namespace);
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  prefix: string
) {
  const account = await getAccount(req, res);

  if (!account) {
    res.status(403).send("Not logged in");
    return;
  }

  const lastChar = prefix[prefix.length - 1];

  if (!SYMBOL_REGEX.test(lastChar)) {
    res.status(400).send("Prefix must end with a symbol");
    return;
  }

  const conflict = await db.findExistingNamespaceConflict(account.id, prefix);

  if (conflict) {
    res.status(400).send("Conflicts with namespace: " + conflict + "*");
    return;
  }

  const namespace: Namespace = {
    prefix,
    registered: false,
    members: [{ id: account.id, role: "admin" }],
  };

  await db.createNamespace(namespace);
  res.send(namespace);
}

async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse,
  prefix: string
) {
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

  const member = namespace.members.find((member) =>
    db.compareIds(member.id, account.id)
  );

  if (member?.role != "admin" && !account.admin) {
    res.status(403).send("Not a namespace admin");
    return;
  }

  const { invited, removed, roleChanges } = req.body;
  const updates: MemberUpdates = { invited, removed, roleChanges };

  await db.updateNamespaceMembers(prefix, updates);

  res.send(undefined);
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  prefix: string
) {
  const account = await getAccount(req, res);

  if (!account) {
    res.status(403).send("Not logged in");
    return;
  }

  const namespace = await db.findNamespace(prefix);

  if (!namespace) {
    res.send(undefined);
    return;
  }

  const member = namespace.members.find((member) =>
    db.compareIds(member.id, account.id)
  );

  if (member?.role != "admin" && !account.admin) {
    res.status(403).send("Not a namespace admin");
    return;
  }

  await db.deleteNamespace(prefix);
  res.send(undefined);
}
