import { PackageMeta } from "@/types/package-meta";
import { Query } from "@/types/query";
import { SortMethod } from "@/types/sort-method";
import { Account } from "@/types/account";
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
} from "mongodb";
import crypto from "crypto";
import { pipeline } from "stream/promises";
import escapeStringRegexp from "escape-string-regexp";

// db: web
// collections: users, packages
// GridFS buckets: fs

export default class MongoBasedDB implements DB {
  client: MongoClient;
  db: MongoDb;
  users: Collection<Account>;
  packages: Collection<PackageMeta>;
  files: Collection<GridFSFile>;
  bucket: GridFSBucket;

  constructor(uri: string) {
    this.client = new MongoClient(uri);
    this.db = this.client.db("web");
    this.users = this.db.collection("users");
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

  async createAccount(account: Account): Promise<unknown> {
    const result = await this.users.insertOne(account);

    return result.insertedId;
  }

  async patchAccount(id: unknown, patch: Partial<Account>) {
    await this.users.updateOne({ _id: id as ObjectId }, { $set: patch });
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
    sortMethod: SortMethod,
    skip: number,
    count: number
  ): Promise<PackageMeta[]> {
    const mongoQuery = toMongoQuery(query);
    const sortParam = toMongoSortParam(sortMethod);

    const metas = await this.packages
      .find(mongoQuery)
      .skip(skip)
      .limit(count)
      .sort(sortParam);

    return await metas.toArray();
  }

  getPackageHashes(ids: string[]): AsyncGenerator<PackageHashResult> {
    const mergeIds = { $concatArrays: [["$package.id"], "$package.past_ids"] };
    const vars = { ids: mergeIds };
    const indexOfId = { $indexOfArray: ["$$ids", ids] };
    const firstMatchingId = { $arrayElemAt: ["$$ids", indexOfId] };

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

    await pipeline(stream, writeStream);

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

    await pipeline(stream, writeStream);

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
}

function toMongoQuery(query: Query) {
  const mongoQuery: Query = {};

  for (const key in query) {
    const value = query[key];

    if (key.startsWith("$")) {
      if (typeof value == "string") {
        // special search case
        mongoQuery[key.slice(1)] = {
          $regex: new RegExp(escapeStringRegexp(value), "i"),
        };
      }

      // protect against possible attacks
      continue;
    }

    // type check to protect against possible attacks
    if (Array.isArray(value)) {
      mongoQuery[key] = { $in: value };
    } else if (typeof value != "object") {
      mongoQuery[key] = value;
    } else if (value instanceof ObjectId) {
      mongoQuery[key] = value;
    }
  }

  return mongoQuery;
}

export function toMongoSortParam(sortMethod: SortMethod): {
  [key: string]: SortDirection;
} {
  switch (sortMethod) {
    case SortMethod.CreationDate:
      return { creation_date: -1 };
    case SortMethod.RecentlyUpdated:
      return { updated_date: -1 };
    // case SortMethod.Downloads:
    //   return { downloads: -1 };
  }
}
