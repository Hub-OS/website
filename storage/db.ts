import { Account } from "@/types/account";
import { PackageMeta } from "@/types/package-meta";
import { Query } from "@/types/query";
import { SortMethod } from "@/types/sort-method";

export interface DB {
  createAccount(account: Account): Promise<unknown>;

  findAccountByDiscordId(discordId: string): Promise<Account | undefined>;

  upsertPackageMeta(meta: PackageMeta): Promise<void>;

  findPackageMeta(id: string): Promise<PackageMeta | undefined>;

  listPackages(
    query: Query,
    sortMethod: SortMethod,
    skip: number,
    count: number
  ): Promise<PackageMeta[]>;

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

export default new Disk() as DB;
