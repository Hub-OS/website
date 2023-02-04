// default storage implementation for development

import { PackageMeta } from "@/types/package-meta";
import { Query, queryTest } from "@/types/query";
import { sortBy, SortMethod } from "@/types/sort-method";
import { Account } from "@/types/account";
import { DB } from "./db";
import fs from "fs";
import fsPromises from "fs/promises";
import crypto from "crypto";
import { pipeline } from "stream/promises";

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
    const existingMeta = this.data.packages.find(
      (storedMeta) => storedMeta.package.id == meta.package.id
    );

    if (existingMeta) {
      existingMeta.package = meta.package;
      existingMeta.dependencies = meta.dependencies;
      existingMeta.defines = meta.defines;
      existingMeta.updated_date = new Date();
    } else {
      meta.creation_date = new Date();
      meta.updated_date = new Date();
      this.data.packages.push(meta);
    }
    await this.save();
  }

  async findPackageMeta(id: string): Promise<PackageMeta | undefined> {
    return this.data.packages.find((meta) => meta.package.id == id);
  }

  async listPackages(
    query: Query,
    sortMethod: SortMethod,
    skip: number,
    count: number
  ): Promise<PackageMeta[]> {
    const packages = [];

    // innefficient, creates a new array
    const relevantPackages = this.data.packages.filter((meta) =>
      queryTest(query, meta)
    );

    sortBy(relevantPackages, sortMethod);

    for (let i = skip; i < relevantPackages.length && i < skip + count; i++) {
      packages.push(relevantPackages[i]);
    }

    return packages;
  }

  async uploadPackageZip(id: string, stream: NodeJS.ReadableStream) {
    const meta = this.data.packages.find((meta) => meta.package.id == id);

    if (!meta) {
      return;
    }

    const hasher = crypto.createHash("md5");

    stream.on("data", (chunk) => {
      hasher.update(chunk);
    });

    const writeStream = fs.createWriteStream(
      `storage/_disk/mods/${encodeURIComponent(id)}.zip`
    );

    await pipeline(stream, writeStream);

    meta.hash = hasher.digest("hex");
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
}
