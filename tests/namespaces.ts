import test, { ExecutionContext } from "ava";
import { requestJSON, requestVoid } from "../types/request";
import { Namespace } from "@/util/namespace";
import { PublicAccountData } from "@/util/public-account-data";

const host = "http://localhost:3000";
const userA = "TEST USER A";
const userB = "TEST USER B";

type NamespaceParams = { prefix: string; username: string };

function encodeAuthorization(username: string) {
  return "Basic " + Buffer.from(username + ":").toString("base64");
}

function createNamespace({ prefix, username }: NamespaceParams) {
  const encodedPrefix = encodeURIComponent(prefix);

  return requestVoid(`${host}/api/namespaces/${encodedPrefix}`, {
    method: "POST",
    headers: {
      authorization: encodeAuthorization(username),
    },
  });
}

function deleteNamespace({ prefix, username }: NamespaceParams) {
  const encodedPrefix = encodeURIComponent(prefix);

  return requestVoid(`${host}/api/namespaces/${encodedPrefix}`, {
    method: "DELETE",
    headers: {
      authorization: encodeAuthorization(username),
    },
  });
}

async function publicAccountData(username: string) {
  const encodedName = encodeURIComponent(username);
  const accountResponse = await requestJSON(
    `${host}/api/users/by-name/${encodedName}`
  );

  if (!accountResponse.ok) {
    throw new Error(accountResponse.error);
  }

  return accountResponse.value as PublicAccountData;
}

async function resolveNamespaceAdminAccount(prefix: string) {
  const encodedPrefix = encodeURIComponent(prefix);
  const namespaceResponse = await requestJSON(
    `${host}/api/namespaces/${encodedPrefix}`
  );

  if (!namespaceResponse.ok) {
    throw new Error(namespaceResponse.error);
  }

  const namespace = namespaceResponse.value as Namespace;
  const admin = namespace.members.find((member) => member.role == "admin")!;
  const adminId = admin.id;

  const adminAccountResponse = await requestJSON(
    `${host}/api/users/${adminId}`
  );

  if (!adminAccountResponse.ok) {
    throw new Error(adminAccountResponse.error);
  }

  return adminAccountResponse.value as PublicAccountData;
}

async function createNamespaceInvite({ prefix, username }: NamespaceParams) {
  const [userAccount, adminAccount] = await Promise.all([
    publicAccountData(username),
    resolveNamespaceAdminAccount(prefix),
  ]);

  const encodedPrefix = encodeURIComponent(prefix);
  const invitedId = userAccount.id;

  return await requestVoid(
    `${host}/api/namespaces/${encodedPrefix}/invite?id=${invitedId}`,
    {
      method: "POST",
      headers: {
        authorization: encodeAuthorization(adminAccount.username),
      },
    }
  );
}

async function acceptNamespaceInvite({ prefix, username }: NamespaceParams) {
  const encodedPrefix = encodeURIComponent(prefix);

  return requestVoid(`${host}/api/namespaces/${encodedPrefix}/invite`, {
    method: "PATCH",
    headers: {
      authorization: encodeAuthorization(username),
    },
  });
}

async function changeNamespaceRole(
  { prefix, username }: NamespaceParams,
  role: string
) {
  const [userAccount, adminAccount] = await Promise.all([
    publicAccountData(username),
    resolveNamespaceAdminAccount(prefix),
  ]);

  const encodedPrefix = encodeURIComponent(prefix);
  const memberId = userAccount.id;

  return requestVoid(
    `${host}/api/namespaces/${encodedPrefix}/members?id=${memberId}&role=${role}`,
    {
      method: "PATCH",
      headers: {
        authorization: encodeAuthorization(adminAccount.username),
      },
    }
  );
}

type CreationCase = [NamespaceParams, boolean];

async function testCreation(t: ExecutionContext, cases: CreationCase[]) {
  try {
    for (const [params, expected] of cases) {
      const result = await createNamespace(params);

      t.deepEqual(result.ok, expected, JSON.stringify(params));
    }
  } finally {
    // cleanup
    await Promise.all(cases.map(([params]) => deleteNamespace(params)));
  }
}

// unreserve `test.` namespace for testing
test.serial.before(async () => {
  await deleteNamespace({ prefix: "test.", username: userA });
});
// reserve `test.` namespace for later testing
test.serial.after.always(async () => {
  await createNamespace({ prefix: "test.", username: userA });
});

{
  test.serial("namespace must end with symbol", async (t) => {
    const cases: CreationCase[] = [
      [{ prefix: "test.a", username: userA }, false],
      [{ prefix: "test.1", username: userA }, false],
      [{ prefix: "test.1.", username: userA }, true],
    ];

    await testCreation(t, cases);
  });
}

{
  test.serial("namespace collision", async (t) => {
    const cases: CreationCase[] = [
      // not blocked
      [{ prefix: "test.a.", username: userA }, true],
      // blocked by test.a.
      [{ prefix: "test.", username: userB }, false],
      // not blocked
      [{ prefix: "test.b.", username: userB }, true],
    ];

    await testCreation(t, cases);
  });
}

{
  test.serial("namespace invite promition", async (t) => {
    const OWNER_PARAMS = { prefix: "test.", username: userA };
    const INVITE_PARAMS = { prefix: "test.", username: userB };
    const ROLE = "collaborator";

    try {
      await createNamespace(OWNER_PARAMS);

      // invite B
      await createNamespaceInvite(INVITE_PARAMS);

      // can't change role from "invite" to "collaborator" by direct use of the API
      const initialResult = await changeNamespaceRole(INVITE_PARAMS, ROLE);
      t.assert(!initialResult.ok);

      // accept invite
      await acceptNamespaceInvite(INVITE_PARAMS);

      // we should be able to change this user's role now
      const postAcceptResult = await changeNamespaceRole(INVITE_PARAMS, ROLE);
      t.assert(postAcceptResult.ok);
    } finally {
      await deleteNamespace(OWNER_PARAMS);
    }
  });
}

{
  test.serial("sub namespace collision", async (t) => {
    try {
      await createNamespace({ prefix: "test.", username: userA });
      await createNamespace({ prefix: "test.a.", username: userA });

      // can't make `test.a.b.` as userA owns `test.a.` and we're not a member
      await testCreation(t, [
        [{ prefix: "test.a.b.", username: userB }, false],
      ]);

      // become a member of test.a.
      await createNamespaceInvite({ prefix: "test.a.", username: userB });
      await acceptNamespaceInvite({ prefix: "test.a.", username: userB });

      // still unable to make `test.b.` as we're not an admin of the namespace
      await testCreation(t, [
        [{ prefix: "test.a.b.", username: userB }, false],
      ]);

      // make an admin
      await changeNamespaceRole(
        { prefix: "test.a.", username: userB },
        "admin"
      );

      // we should be able to create `test.a.b.` as userB now
      const test_a_b = await createNamespace({
        prefix: "test.a.b.",
        username: userB,
      });

      t.assert(test_a_b.ok);

      // still unable to make `test.b.` as we're not in the relevant `test.` namespace
      await testCreation(t, [[{ prefix: "test.b.", username: userB }, false]]);

      // userA can't create a namespace within userB's namespace without invitation
      await testCreation(t, [
        [{ prefix: "test.a.b.a.", username: userA }, false],
      ]);
    } finally {
      await deleteNamespace({ prefix: "test.", username: userA });
      await deleteNamespace({ prefix: "test.a.", username: userA });
      await deleteNamespace({ prefix: "test.a.b.", username: userB });
    }
  });
}
