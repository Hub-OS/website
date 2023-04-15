import { Account } from "@/types/account";
import { PackageMeta } from "@/types/package-meta";
import { Query } from "@/types/query";
import { SortMethod } from "@/types/sort-method";

export type PackageHashResult = { id: string; category: string; hash?: string };

export interface DB {
  compareIds(a: unknown, b: unknown): boolean;

  stringToId(id: string): unknown;

  createAccount(account: Account): Promise<unknown>;

  patchAccount(id: unknown, patch: Partial<Account>): Promise<void>;

  findAccountById(id: unknown): Promise<Account | undefined>;

  findAccountByDiscordId(discordId: string): Promise<Account | undefined>;

  upsertPackageMeta(meta: PackageMeta): Promise<void>;

  patchPackageMeta(id: string, patch: { [key: string]: any }): Promise<void>;

  findPackageMeta(id: string): Promise<PackageMeta | undefined>;

  listPackages(
    query: Query,
    sortMethod: SortMethod,
    skip: number,
    count: number
  ): Promise<PackageMeta[]>;

  getPackageHashes(ids: string[]): AsyncGenerator<PackageHashResult>;

  uploadPackageZip(id: string, stream: NodeJS.ReadableStream): Promise<void>;

  downloadPackageZip(id: string): Promise<NodeJS.ReadableStream | undefined>;

  uploadPackagePreview(
    id: string,
    stream: NodeJS.ReadableStream
  ): Promise<void>;

  downloadPackagePreview(
    id: string
  ): Promise<NodeJS.ReadableStream | undefined>;

  deletePackage(id: string): Promise<void>;
}

import Disk from "./disk";
import MongoBasedDB from "./mongo";

let db: DB;

if (process.env.MONGO_URI) {
  db = new MongoBasedDB(process.env.MONGO_URI);
} else {
  db = new Disk();
}

export default db;
