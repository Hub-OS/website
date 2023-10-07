// default storage implementation for development

import { PackageMeta } from "@/types/package-meta";
import { Query, queryTest } from "@/types/query";
import { sortBy, SortMethod } from "@/types/sort-method";
import { Account } from "@/types/account";
import { DB, PackageHashResult } from "./db";
import fs from "fs";
import fsPromises from "fs/promises";
import crypto from "crypto";
import { pipeline } from "stream/promises";
import _ from "lodash";

type Data = {
  packages: PackageMeta[];
  accounts: Account[];
  latest_account: number;
};

const databaseFilePath = "storage/_disk/data.json";

function loadData(): Data {
  try {
    // assuming the data is stored properly, if it isn't we can just delete the file
    const buffer = fs.readFileSync(databaseFilePath);
    const json = buffer.toString();
    const db = JSON.parse(json) as Data;

    for (const meta of db.packages) {
      meta.creation_date = new Date(meta.creation_date);
      meta.updated_date = new Date(meta.updated_date);
    }

    return db;
  } catch {
    return {
      packages: [],
      accounts: [],
      latest_account: 0,
    };
  }
}

export default class Disk implements DB {
  data: Data;

  constructor() {
    this.data = loadData();
    fs.mkdirSync("storage/_disk/mods", { recursive: true });
  }

  async save() {
    fs.writeFile(databaseFilePath, JSON.stringify(this.data), () => {});
  }

  compareIds(a: unknown, b: unknown): boolean {
    return a == b;
  }

  stringToId(id: string): unknown {
    return +id;
  }

  async createAccount(account: Account): Promise<unknown> {
    const newAccount = {
      ...account,
      id: this.data.latest_account,
    };

    this.data.latest_account++;

    this.data.accounts.push(newAccount);
    await this.save();

    return newAccount.id;
  }

  async patchAccount(id: unknown, patch: Partial<Account>): Promise<void> {
    const account = await this.findAccountById(id);

    if (!account) {
      return;
    }

    Object.assign(account, patch);
  }

  async findAccountById(id: unknown): Promise<Account | undefined> {
    return this.data.accounts.find((account) => account.id == id);
  }

  async findAccountByDiscordId(
    discordId: string
  ): Promise<Account | undefined> {
    return this.data.accounts.find(
      (account) => account.discord_id == discordId
    );
  }

  async upsertPackageMeta(meta: PackageMeta) {
    const existingMeta = await this.findPackageMeta(meta.package.id);

    if (existingMeta) {
      existingMeta.package = meta.package;
      existingMeta.dependencies = meta.dependencies;
      existingMeta.defines = meta.defines;
    } else {
      meta.creation_date = new Date();
      meta.updated_date = new Date();
      this.data.packages.push(meta);
    }
    await this.save();
  }

  async patchPackageMeta(id: string, patch: { [key: string]: any }) {
    const meta = this.data.packages.find((meta) => meta.package.id == id);

    if (!meta) {
      return;
    }

    for (const key in patch) {
      _.set(meta, key, patch[key]);
    }

    await this.save();
  }

  async findPackageMeta(id: string): Promise<PackageMeta | undefined> {
    return this.data.packages.find(
      (meta) => meta.package.id == id || meta.package.past_ids?.includes(id)
    );
  }

  async findPackageMetas(ids: string[]): Promise<PackageMeta[]> {
    const promises = ids.map((id) => this.findPackageMeta(id));
    const packageMetas = await Promise.all(promises);

    return packageMetas.filter((meta) => meta != undefined) as PackageMeta[];
  }

  async listPackages(
    query: Query,
    sortMethod: SortMethod | null,
    skip: number,
    count: number
  ): Promise<PackageMeta[]> {
    const packages = [];

    // innefficient, creates a new array
    const relevantPackages = this.data.packages.filter((meta) =>
      queryTest(query, meta)
    );

    if (sortMethod) {
      sortBy(relevantPackages, sortMethod);
    }

    for (let i = skip; i < relevantPackages.length && i < skip + count; i++) {
      packages.push(relevantPackages[i]);
    }

    return packages;
  }

  async *getPackageHashes(ids: string[]): AsyncGenerator<PackageHashResult> {
    const results = this.data.packages
      .filter(
        (meta) =>
          ids.includes(meta.package.id) ||
          meta.package.past_ids?.some((id) => ids.includes(id))
      )
      .map((meta) => ({
        id: [meta.package.id, ...(meta.package.past_ids || [])].find((id) =>
          ids.includes(id)
        )!,
        category: meta.package.category,
        hash: meta.hash,
      }));

    for (const result of results) {
      yield result;
    }
  }

  async uploadPackageZip(id: string, stream: NodeJS.ReadableStream) {
    const meta = this.data.packages.find((meta) => meta.package.id == id);

    if (!meta) {
      return;
    }

    const hasher = crypto.createHash("sha256");

    stream.on("data", (chunk) => {
      hasher.update(chunk);
    });

    const writeStream = fs.createWriteStream(
      `storage/_disk/mods/${encodeURIComponent(id)}.zip`
    );

    await pipeline(stream, writeStream);

    const hash = hasher.digest("hex");

    if (meta.hash != hash) {
      meta.hash = hash;
      meta.updated_date = new Date();
    }

    await this.save();
  }

  async downloadPackageZip(
    id: string
  ): Promise<NodeJS.ReadableStream | undefined> {
    return fs.createReadStream(
      `storage/_disk/mods/${encodeURIComponent(id)}.zip`
    );
  }

  async uploadPackagePreview(id: string, stream: NodeJS.ReadableStream) {
    const writeStream = fs.createWriteStream(
      `storage/_disk/mods/${encodeURIComponent(id)}.png`
    );

    await pipeline(stream, writeStream);
  }

  async downloadPackagePreview(
    id: string
  ): Promise<NodeJS.ReadableStream | undefined> {
    return fs.createReadStream(
      `storage/_disk/mods/${encodeURIComponent(id)}.png`
    );
  }

  async deletePackage(id: string): Promise<void> {
    const index = this.data.packages.findIndex((meta) => meta.package.id == id);

    if (index == -1) {
      return;
    }

    // swap remove to avoid shifting every element
    this.data.packages[index] =
      this.data.packages[this.data.packages.length - 1];
    this.data.packages.pop();

    await Promise.all([
      fsPromises.rm(`storage/_disk/mods/${encodeURIComponent(id)}.png`),
      fsPromises.rm(`storage/_disk/mods/${encodeURIComponent(id)}.zip`),
      this.save(),
    ]);
  }

  async deletePackages(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => this.deletePackage(id)));
  }
}
