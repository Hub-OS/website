import { Account, AccountIdNameMap } from "@/types/account";
import { PackageMeta } from "@/types/package-meta";
import { Query } from "@/types/query";
import { SortMethod } from "@/types/sort-method";

export type PackageHashResult = { id: string; category: string; hash?: string };

export interface DB {
  compareIds(a: unknown, b: unknown): boolean;

  stringToId(id: string): unknown;
  idToString(id: unknown): string;

  createAccount(account: Account): Promise<unknown>;

  patchAccount(id: unknown, patch: Partial<Account>): Promise<void>;

  findAccountByName(username: string): Promise<Account | undefined>;

  findAccountById(id: unknown): Promise<Account | undefined>;

  findAccountByDiscordId(discordId: string): Promise<Account | undefined>;

  createAccountNameMap(ids: unknown[]): Promise<AccountIdNameMap>;

  createNamespace(namespace: Namespace): Promise<void>;

  registerNamespace(prefix: string): Promise<void>;

  findExistingNamespaceConflict(
    accountId: unknown,
    prefix: string
  ): Promise<string | undefined>;

  findMemberOrInvitedNamespaces(accountId: unknown): Promise<Namespace[]>;

  findNamespace(prefix: string): Promise<Namespace | undefined>;

  findPackageNamespace(id: string): Promise<Namespace | undefined>;

  updateNamespaceMembers(prefix: string, updates: MemberUpdates): Promise<void>;

  deleteNamespace(prefix: string): Promise<void>;

  upsertPackageMeta(meta: PackageMeta): Promise<void>;

  patchPackageMeta(id: string, patch: { [key: string]: any }): Promise<void>;

  findPackageMeta(id: string): Promise<PackageMeta | undefined>;

  findPackageMetas(ids: string[]): Promise<PackageMeta[]>;

  listPackages(
    query: Query,
    sortMethod: SortMethod | null,
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
  deletePackages(id: string[]): Promise<void>;

  countPackageUploadsForUser(id: unknown, startDate: Date): Promise<number>;
}

import Disk from "./disk";
import MongoBasedDB from "./mongo";
import { MemberUpdates, Namespace } from "@/types/namespace";

let db: DB;

if (process.env.MONGO_URI) {
  db = new MongoBasedDB(process.env.MONGO_URI);
} else {
  db = new Disk();
}

export default db;
