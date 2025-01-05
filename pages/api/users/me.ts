import { NextApiRequest, NextApiResponse } from "next";
import {
  PublicAccountData,
  intoPublicAccount,
} from "@/types/public-account-data";
import { Account, normalizeUsername } from "@/types/account";
import db from "@/storage/db";
import { MongoServerError } from "mongodb";
import { getCookie } from "cookies-next";
import { verifyJwt } from "@/types/jwt";

export async function getAccount(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.TEST_ENV && req.headers.authorization?.startsWith("Basic ")) {
    // TEST_ENV only
    // blindly accept any `Authorization: Basic *` request ignoring password
    const base64 = req.headers.authorization.slice(6);
    const credentials = Buffer.from(base64, "base64").toString("utf-8");
    const username = credentials.slice(0, credentials.indexOf(":"));

    let account = await db.findAccountByName(username);

    if (!account) {
      // create a new account
      account = {
        username,
        normalized_username: normalizeUsername(username),
        avatar: "",
      };

      account.id = await db.createAccount(account);
    }

    return account;
  }

  // normal flow

  const token = await getCookie("token", { req, res });

  if (typeof token != "string") {
    return;
  }

  const jwtPayload = await verifyJwt(token);

  if (typeof jwtPayload != "object") {
    return;
  }

  const account = await db.findAccountById(db.stringToId(jwtPayload.user_id));

  if (account?.banned) {
    // this should prevent the user performing any requests under their account
    // as this function is used by api endpoints that require authentication
    return;
  }

  return account;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const account = await getAccount(req, res);

  if (!account) {
    res.status(401).send(undefined);
    return;
  }

  if (req.method == "GET") {
    return handleGet(account, req, res);
  } else if (req.method == "PATCH") {
    return await handlePatch(account, req, res);
  } else {
    res.status(400).send("undefined");
  }
}

function handleGet(
  account: Account,
  _req: NextApiRequest,
  res: NextApiResponse<PublicAccountData | undefined>
) {
  res.status(200).json(intoPublicAccount(account));
}

const USERNAME_REGEX = /^[a-z0-9_-]+$/i;

async function handlePatch(
  account: Account,
  req: NextApiRequest,
  res: NextApiResponse<PublicAccountData | string | undefined>
) {
  const patchRequest = req.body;
  const patch: Partial<Account> = {};

  if (
    typeof patchRequest.username == "string" &&
    patchRequest.username != account.username
  ) {
    patch.username = patchRequest.username;
    patch.normalized_username = normalizeUsername(patchRequest.username);

    if (!USERNAME_REGEX.test(patchRequest.username)) {
      // restrict username for client font, as well as avoiding name clash with discord
      // todo: mention which characters are invalid?
      res.status(400).send("Username contains invalid characters");
      return;
    }
  }

  try {
    await db.patchAccount(account.id!, patch);
  } catch (error) {
    console.error(error);
    if (error instanceof MongoServerError) {
      // assume duplicate key
      res.status(400).send("A user with that name already exists.");
    } else {
      res.status(500).send(undefined);
    }
    return;
  }

  Object.assign(account, patch);

  res.status(200).json(intoPublicAccount(account));
}
