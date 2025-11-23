import { PackageMeta } from "@/types/package-meta";
import { Query } from "@/types/query";
import { SortMethod } from "@/types/sort-method";
import { Account, AccountIdNameMap, normalizeUsername } from "@/types/account";
import {
  MemberUpdates,
  Namespace,
  Role,
  SYMBOL_REGEX,
} from "@/types/namespace";
import { DB, PackageHashResult } from "./db";
import {
  Collection,
  Db as MongoDb,
  GridFSBucket,
  GridFSFile,
  MongoClient,
  ObjectId,
  SortDirection,
  WithId,
  MatchKeysAndValues,
  UpdateOptions,
  UpdateFilter,
} from "mongodb";
import crypto from "crypto";
import { pipeline } from "stream/promises";
import escapeStringRegexp from "escape-string-regexp";
import { BugReport } from "@/types/bug-report";

// db: web
// collections: users, packages
// GridFS buckets: fs

export default class MongoBasedDB implements DB {
  client: MongoClient;
  db: MongoDb;
  users: Collection<Account>;
  namespaces: Collection<Namespace>;
  packages: Collection<PackageMeta>;
  files: Collection<GridFSFile>;
  bucket: GridFSBucket;

  constructor(uri: string) {
    this.client = new MongoClient(uri);
    this.db = this.client.db("web");
    this.users = this.db.collection("users");
    this.namespaces = this.db.collection("namespaces");
    this.packages = this.db.collection("packages");
    this.files = this.db.collection("fs.files");
    this.bucket = new GridFSBucket(this.db);

    this.users.createIndex({ normalized_username: 1 }, { unique: true });
  }

  compareIds(a: unknown, b: unknown): boolean {
    return a instanceof ObjectId && b instanceof ObjectId && a.equals(b);
  }

  stringToId(id: string): unknown {
    try {
      return new ObjectId(id);
    } catch {
      return new ObjectId();
    }
  }

  idToString(id: unknown): string {
    return (id as ObjectId).toHexString();
  }

  async createAccount(account: Account): Promise<unknown> {
    const result = await this.users.insertOne(account);

    return result.insertedId;
  }

  async patchAccount(id: unknown, patch: Partial<Account>) {
    await this.users.updateOne({ _id: id as ObjectId }, { $set: patch });
  }

  async findAccountByName(username: string): Promise<Account | undefined> {
    const normalized_username = normalizeUsername(username);
    const user = await this.users.findOne({ normalized_username });

    if (!user) {
      return;
    }

    user.id = user?._id;

    return user;
  }

  async findAccountById(id: unknown): Promise<Account | undefined> {
    const user = await this.users.findOne({ _id: id as ObjectId });

    if (!user) {
      return;
    }

    user.id = user?._id;

    return user;
  }

  async findAccountByDiscordId(
    discordId: string
  ): Promise<Account | undefined> {
    const user = await this.users.findOne({ discord_id: discordId });

    if (!user) {
      return;
    }

    user.id = user?._id;

    return user;
  }

  async createAccountNameMap(ids: unknown[]): Promise<AccountIdNameMap> {
    const users = await this.users
      .find({ _id: { $in: ids as ObjectId[] } })
      .project({ username: 1 })
      .toArray();

    const map: AccountIdNameMap = {};

    for (const user of users) {
      map[user._id.toHexString()] = user.username;
    }

    return map;
  }

  async createNamespace(namespace: Namespace): Promise<void> {
    await this.namespaces.insertOne(namespace);
  }

  async registerNamespace(prefix: string): Promise<void> {
    await this.namespaces.updateOne({ prefix }, { $set: { registered: true } });
  }

  async findExistingNamespaceConflict(
    accountId: unknown,
    prefix: string
  ): Promise<string | undefined> {
    // find identical match
    const exists = await this.namespaces.findOne(
      { prefix },
      { projection: { _id: 0 } }
    );

    if (exists) {
      return prefix;
    }

    const prefixLenExpr = { $strLenBytes: "$prefix" };
    const isAdminExpr = { $in: [{ id: accountId, role: "admin" }, "$members"] };
    const pipelinePreparations = [
      { $match: { prefix: initialNamespaceRegex(prefix)! } },
      {
        $project: { prefix: 1, prefixLen: prefixLenExpr, isAdmin: isAdminExpr },
      },
    ];
    type PipelineResult = { prefix: string; isAdmin: boolean };
    const pipelineCompletion = [
      {
        $group: {
          _id: null,
          prefix: { $top: { output: "$prefix", sortBy: { prefixLen: -1 } } },
          isAdmin: { $top: { output: "$isAdmin", sortBy: { prefixLen: -1 } } },
        },
      },
    ];

    // stored is a subtring if the start of our prefix matches the stored prefix
    // same as prefix.startsWith($prefix)
    const isStoredASubstrExpr = caseInsensitiveEqExpr("$prefix", {
      $substrBytes: [prefix, 0, prefixLenExpr],
    });
    // substring of stored if our prefix matches the start of the stored prefix
    // same as $prefix.startsWith(prefix)
    const isSubstrOfStoredExpr = caseInsensitiveEqExpr(prefix, {
      $substrBytes: ["$prefix", 0, prefix.length],
    });

    // grab the longest prefix that's shorter than our prefix
    const relevantNamespacePromise = this.namespaces
      .aggregate<PipelineResult>([
        ...pipelinePreparations,
        { $match: { $expr: isStoredASubstrExpr } },
        ...pipelineCompletion,
      ])
      .next();

    // grab the longest prefix that conflicts with our prefix
    const conflictPromise = this.namespaces
      .aggregate<PipelineResult>([
        ...pipelinePreparations,
        {
          $match: {
            $expr: {
              $and: [
                { $or: [isStoredASubstrExpr, isSubstrOfStoredExpr] },
                { $not: "$isAdmin" },
              ],
            },
          },
        },
        ...pipelineCompletion,
      ])
      .next();

    const [relevantNamespace, conflict] = await Promise.all([
      relevantNamespacePromise,
      conflictPromise,
    ]);

    if (!conflict) {
      // no conflcit
      return;
    }

    if (
      relevantNamespace &&
      relevantNamespace.isAdmin &&
      relevantNamespace.prefix.length > conflict.prefix.length
    ) {
      // for registering x.y.z.*
      // not being an admin of x.* doesn't matter as long as we're an admin of x.y.*
      return;
    }

    return conflict.prefix;
  }

  async findMemberOrInvitedNamespaces(
    accountId: unknown
  ): Promise<Namespace[]> {
    return this.namespaces
      .find({ "members.id": accountId as ObjectId })
      .sort({ prefix: 1 })
      .toArray();
  }

  async findNamespace(prefix: string): Promise<Namespace | undefined> {
    const namespace = await this.namespaces.findOne({ prefix });

    if (!namespace) {
      return;
    }

    return namespace;
  }

  async findPackageNamespace(id: string): Promise<Namespace | undefined> {
    const initialRegex = initialNamespaceRegex(id);

    if (!initialRegex) {
      // if we can't make a regex, it's impossible to have a namespace
      return;
    }

    // stored is a subtring if the start of our prefix matches the stored prefix
    const isStoredASubstrExpr = caseInsensitiveEqExpr("$prefix", {
      $substrBytes: [id, 0, "$prefixLen"],
    });
    const registeredExpr = "$registered";

    const sortBy = { prefixLen: -1 };
    const prefixLen = { $strLenBytes: "$prefix" };

    const namespace = await this.namespaces
      .aggregate<Namespace>([
        { $match: { prefix: initialRegex, registered: true } },
        {
          $project: { _id: 1, prefix: 1, registered: 1, members: 1, prefixLen },
        },
        { $match: { $expr: { $and: [isStoredASubstrExpr, registeredExpr] } } },
        {
          $group: {
            _id: null,
            prefix: { $top: { output: "$prefix", sortBy } },
            registered: { $top: { output: "$registered", sortBy } },
            members: { $top: { output: "$members", sortBy } },
          },
        },
      ])
      .next();

    if (!namespace) {
      return;
    }

    return namespace;
  }

  async updateNamespaceMembers(
    prefix: string,
    updates: MemberUpdates
  ): Promise<void> {
    type UpdateOneSpread = [
      Partial<Namespace> | UpdateFilter<Namespace>,
      UpdateOptions | undefined
    ];
    const updateOperations: UpdateOneSpread[] = [];

    // remove
    if (updates.invited.length > 0 || updates.removed.length > 0) {
      const $in = [];

      for (const id of updates.invited) {
        $in.push(this.stringToId(id as string));
      }

      for (const id of updates.removed) {
        $in.push(this.stringToId(id as string));
      }

      const $pull = { members: { id: { $in } } };

      // apply immediately, as we don't want to delete new invites
      await this.namespaces.updateOne({ prefix }, { $pull });
    }

    // invite
    if (updates.invited.length > 0) {
      const $push = {
        members: {
          $each: updates.invited.map((id) => ({
            id: this.stringToId(id as string),
            role: "invited" as Role,
          })),
        },
      };

      updateOperations.push([{ $push }, undefined]);
    }

    // role changes
    const $set: MatchKeysAndValues<Namespace> = {};
    const arrayFilters: { [key: string]: any }[] = [];
    let i = 0;

    for (const key in updates.roleChanges) {
      const id = this.stringToId(key as string);

      $set[`members.$[i${i}].role`] = updates.roleChanges[key];
      arrayFilters.push({ [`i${i}.id`]: id });
      i++;
    }

    if (arrayFilters.length > 0) {
      updateOperations.push([{ $set }, { arrayFilters }]);
    }

    // update, separate updates as we're not allowed to modify the same field in multiple operations
    await Promise.all(
      updateOperations.map((args) =>
        this.namespaces.updateOne({ prefix }, ...args)
      )
    );

    // todo: prevent duplicates from invites to the same user from multiple sessions

    // delete the namespace if it no longer has any admins
    await this.namespaces.deleteOne({
      prefix,
      "members.role": { $ne: "admin" },
    });
  }

  async deleteNamespace(prefix: string): Promise<void> {
    await this.namespaces.deleteOne({ prefix });
  }

  async upsertPackageMeta(meta: PackageMeta) {
    const promise = this.findPackageMeta(meta.package.id);
    const existingMeta = (await promise) as WithId<PackageMeta>;

    if (existingMeta) {
      await this.packages.updateOne(
        { _id: existingMeta._id },
        {
          $set: {
            package: meta.package,
            dependencies: meta.dependencies,
            defines: meta.defines,
          },
        }
      );
    } else {
      meta.creation_date = new Date();
      meta.updated_date = new Date();
      await this.packages.insertOne(meta);
    }
  }

  async patchPackageMeta(id: string, patch: { [key: string]: any }) {
    await this.packages.updateOne({ "package.id": id }, { $set: { ...patch } });
  }

  async findPackageMeta(id: string): Promise<PackageMeta | undefined> {
    const meta = await this.packages.findOne({
      $or: [{ "package.id": id }, { "package.past_ids": id }],
    });

    if (!meta) {
      return;
    }

    return meta;
  }

  async findPackageMetas(ids: string[]): Promise<PackageMeta[]> {
    return this.packages
      .find({
        $or: [
          { "package.id": { $in: ids } },
          { "package.past_ids": { $in: ids } },
        ],
      })
      .toArray();
  }

  async listPackages(
    query: Query,
    sortMethod: SortMethod | null,
    skip: number,
    count: number
  ): Promise<PackageMeta[]> {
    const mongoQuery = toMongoQuery(query);

    let findCursor = this.packages.find(mongoQuery).skip(skip).limit(count);

    if (sortMethod != null) {
      const sortParam = toMongoSortParam(sortMethod);
      findCursor = findCursor.sort(sortParam);
    }

    return await findCursor.toArray();
  }

  getPackageHashes(ids: string[]): AsyncGenerator<PackageHashResult> {
    const vars = {
      ids: {
        $concatArrays: [
          ["$package.id"],
          { $ifNull: ["$package.past_ids", []] },
        ],
      },
    };

    const firstMatchingId = {
      $first: {
        $filter: {
          input: "$$ids",
          cond: { $in: ["$$this", ids] },
          limit: 1,
        },
      },
    };

    return this.packages.aggregate([
      {
        $match: {
          $or: [
            { "package.id": { $in: ids } },
            { "package.past_ids": { $in: ids } },
          ],
        },
      },
      {
        $project: {
          _id: 0,
          id: { $let: { vars, in: firstMatchingId } },
          category: "$package.category",
          hash: 1,
        },
      },
    ]) as unknown as AsyncGenerator<PackageHashResult>;
  }

  async uploadPackageZip(id: string, stream: NodeJS.ReadableStream) {
    const hasher = crypto.createHash("sha256");

    stream.on("data", (chunk) => {
      hasher.update(chunk);
    });

    const name = `${id}.zip`;
    const writeStream = this.bucket.openUploadStream(name);

    try {
      await pipeline(stream, writeStream);
    } catch (err) {
      // throw out new upload
      await this.bucket.delete(writeStream.id);
      throw err;
    }

    // remove duplicate files
    this.deleteDuplicateFiles(name, writeStream.id);

    // update hash
    const query = { "package.id": id };
    const projection = { hash: 1 };
    const meta = await this.packages.findOne(query, { projection });

    const hash = hasher.digest("hex");

    if (meta && meta.hash != hash) {
      await this.packages.updateOne(query, {
        $set: {
          hash,
          updated_date: new Date(),
        },
      });
    }
  }

  async downloadPackageZip(
    id: string
  ): Promise<NodeJS.ReadableStream | undefined> {
    return this.openDownloadStream(`${id}.zip`);
  }

  async uploadPackagePreview(id: string, stream: NodeJS.ReadableStream) {
    const name = `${id}.png`;
    const writeStream = this.bucket.openUploadStream(name);

    try {
      await pipeline(stream, writeStream);
    } catch (err) {
      // throw out new upload
      await this.bucket.delete(writeStream.id);
      throw err;
    }

    this.deleteDuplicateFiles(name, writeStream.id);
  }

  async downloadPackagePreview(
    id: string
  ): Promise<NodeJS.ReadableStream | undefined> {
    return this.openDownloadStream(`${id}.png`);
  }

  async deletePackage(id: string): Promise<void> {
    await Promise.all([
      this.deletePackageFiles(id),
      this.packages.deleteOne({ "package.id": id }),
    ]);
  }

  async deletePackages(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => this.deletePackage(id)));
  }

  async openDownloadStream(
    name: string
  ): Promise<NodeJS.ReadableStream | undefined> {
    const file = await this.files.findOne({ filename: name });

    if (!file) {
      return;
    }

    return this.bucket.openDownloadStream(file._id);
  }

  async deleteFile(name: string) {
    const file = await this.files.findOne({ filename: name });

    if (!file) {
      return;
    }

    return this.bucket.delete(file._id);
  }

  async deletePackageFiles(id: string): Promise<void> {
    await Promise.all([
      this.deleteFile(`${id}.png`),
      this.deleteFile(`${id}.zip`),
    ]);
  }

  async deleteDuplicateFiles(name: string, latest_id: ObjectId) {
    const query = {
      _id: { $ne: latest_id },
      filename: name,
    };

    for await (const file of this.files.find(query)) {
      await this.bucket.delete(file._id);
    }
  }

  countPackageUploadsForUser(id: unknown, startDate: Date): Promise<number> {
    return this.packages.countDocuments({
      creator: id,
      creation_date: { $gt: startDate },
    });
  }

  async createBugReport(type: string, content: string): Promise<void> {
    await this.db
      .collection("bugReports")
      .insertOne({ type, content, creation_date: new Date() });

    // delete anything older than 30 days
    const date = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);

    await this.db
      .collection("bugReports")
      .deleteMany({ creation_date: { $lt: date } });
  }

  listBugReports(): AsyncGenerator<BugReport> {
    const cursor = this.db.collection("bugReports").find({});

    return cursor as unknown as AsyncGenerator<BugReport>;
  }
}

function toMongoQuery(query: Query) {
  let mongoQuery: Query = {};
  const orRoots = [];

  for (let key in query) {
    const value = query[key];

    // handle |
    const branches = key.split(" | ");

    if (branches.length > 1) {
      const $or = branches.map((key) => {
        const mongoSubQuery = {};
        resolveMongoSubQuery(mongoSubQuery, key, value);
        return mongoSubQuery;
      });

      orRoots.push({ $or });
    } else {
      resolveMongoSubQuery(mongoQuery, key, value);
    }
  }

  if (orRoots.length > 0) {
    orRoots.push(mongoQuery);
    mongoQuery = { $and: orRoots };
  }

  return mongoQuery;
}

function resolveMongoSubQuery(mongoQuery: Query, key: string, value: any) {
  // handle "!"
  const oldKey = key;
  key = key.replace(/^!+/, "");
  const invert = (oldKey.length - key.length) % 2 == 1;

  // handle other special prefixes
  const firstChar = key[0];

  switch (firstChar) {
    case "$":
      // special search case
      if (typeof value == "string") {
        mongoQuery[key.slice(1)] = {
          $regex: new RegExp(escapeStringRegexp(value), "i"),
        };
      }
      break;
    case "^":
      // special search case
      if (typeof value == "string") {
        mongoQuery[key.slice(1)] = {
          $regex: new RegExp("^" + escapeStringRegexp(value), "i"),
        };
      }
      break;
    default:
      // type check to protect against possible attacks
      if (Array.isArray(value)) {
        mongoQuery[key] = { $in: value };
      } else if (typeof value != "object") {
        mongoQuery[key] = value;
      } else if (value instanceof ObjectId) {
        mongoQuery[key] = value;
      }
      break;
  }

  if (invert) {
    mongoQuery[key] = { $not: mongoQuery[key] };
  }
}

function toMongoSortParam(sortMethod: SortMethod): {
  [key: string]: SortDirection;
} {
  switch (sortMethod) {
    case SortMethod.CreationDate:
      return { creation_date: -1 };
    case SortMethod.RecentlyUpdated:
      return { updated_date: -1 };
    case SortMethod.PackageId:
      return { "package.id": 1 };
    // case SortMethod.Downloads:
    //   return { downloads: -1 };
  }
}

function initialNamespaceRegex(id: string): RegExp | undefined {
  const index = id.search(SYMBOL_REGEX);

  if (index == -1) {
    return;
  }

  return new RegExp("^" + id.slice(0, index + 1), "i");
}

function caseInsensitiveEqExpr(a: any, b: any) {
  return {
    $eq: [{ $strcasecmp: [a, b] }, 0],
  };
}
