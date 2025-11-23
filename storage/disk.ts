// default storage implementation for development

import { PackageMeta } from "@/util/package-meta";
import { Query, queryTest } from "@/util/query";
import { sortBy, SortMethod } from "@/util/sort-method";
import { Account, AccountIdNameMap, normalizeUsername } from "@/util/account";
import { MemberUpdates, Namespace, Role } from "@/util/namespace";
import { BugReport } from "@/util/bug-report";
import { DB, PackageHashResult } from "./db";
import fs from "fs";
import fsPromises from "fs/promises";
import crypto from "crypto";
import { pipeline } from "stream/promises";
import _ from "lodash";

type Data = {
  packages: PackageMeta[];
  namespaces: Namespace[];
  accounts: Account[];
  bugReports: BugReport[];
  latest_account: number;
};

const databaseFilePath = "storage/_disk/data.json";

function loadData(): Data {
  const defaultData = {
    packages: [],
    namespaces: [],
    accounts: [],
    bugReports: [],
    latest_account: 0,
  };

  try {
    // assuming the data is stored properly, if it isn't we can just delete the file
    const buffer = fs.readFileSync(databaseFilePath);
    const json = buffer.toString();
    const db = JSON.parse(json) as Data;

    for (const meta of db.packages) {
      meta.creation_date = new Date(meta.creation_date);
      meta.updated_date = new Date(meta.updated_date);
    }

    for (const key in defaultData) {
      // use default for missing keys
      // @ts-ignore
      db[key] = db[key] || defaultData[key];
    }

    return db;
  } catch {
    return defaultData;
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

  idToString(id: unknown): string {
    return String(id);
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

  async findAccountByName(username: string): Promise<Account | undefined> {
    const normalized_username = normalizeUsername(username);
    return this.data.accounts.find(
      (account) => account.normalized_username == normalized_username
    );
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

  async createAccountNameMap(ids: unknown[]): Promise<AccountIdNameMap> {
    const users = this.data.accounts.filter((account) =>
      ids.includes(account.id)
    );

    const map: { [id: string]: string } = {};

    for (const user of users) {
      map[this.idToString(user.id)] = user.username;
    }

    return map;
  }

  async createNamespace(namespace: Namespace): Promise<void> {
    this.data.namespaces.push(namespace);
  }

  async registerNamespace(prefix: string): Promise<void> {
    const namespace = this.data.namespaces.find(
      (namespace) => namespace.prefix == prefix
    );

    if (namespace) {
      namespace.registered = true;
    }
  }

  async findExistingNamespaceConflict(
    accountId: unknown,
    prefix: string
  ): Promise<string | undefined> {
    let relevantNamespace: Namespace | undefined;
    let conflict;

    for (const namespace of this.data.namespaces) {
      if (namespace.prefix == prefix) {
        return prefix;
      }

      const isConflict =
        namespace.prefix.startsWith(prefix) ||
        prefix.startsWith(namespace.prefix);

      if (!isConflict) {
        continue;
      }

      if (
        namespace.prefix.length < prefix.length &&
        (!relevantNamespace ||
          namespace.prefix.length > relevantNamespace.prefix.length)
      ) {
        // longest namespace shorter than our prefix
        relevantNamespace = namespace;
      }

      const isAdmin = namespace.members.some(
        (member) => member.id == accountId && member.role == "admin"
      );

      if (isAdmin) {
        // not a real conflict if we're an admin of this namespace
        continue;
      }

      if (!conflict || conflict.prefix.length < namespace.prefix.length) {
        // longest conflict
        conflict = namespace;
      }
    }

    if (!conflict) {
      // no conflcit
      return;
    }

    const isAdmin =
      relevantNamespace &&
      relevantNamespace.members.some(
        (member) => member.id == accountId && member.role == "admin"
      );

    if (isAdmin && relevantNamespace!.prefix.length > conflict.prefix.length) {
      // for registering x.y.z.*
      // not being an admin of x.* doesn't matter as long as we're an admin of x.y.*
      return;
    }

    return conflict.prefix;
  }

  async findMemberOrInvitedNamespaces(
    accountId: unknown
  ): Promise<Namespace[]> {
    return this.data.namespaces.filter((namespace) =>
      namespace.members.some((member) => member.id == accountId)
    );
  }

  async findNamespace(prefix: string): Promise<Namespace | undefined> {
    return this.data.namespaces.find((namespace) => namespace.prefix == prefix);
  }

  async findPackageNamespace(id: string): Promise<Namespace | undefined> {
    let longestNamespace;

    for (const namespace of this.data.namespaces) {
      if (!namespace.registered || !id.startsWith(namespace.prefix)) {
        continue;
      }

      if (
        !longestNamespace ||
        namespace.prefix.length > longestNamespace.prefix.length
      ) {
        longestNamespace = namespace;
      }
    }

    return longestNamespace;
  }

  async updateNamespaceMembers(
    prefix: string,
    updates: MemberUpdates
  ): Promise<void> {
    const namespace = await this.findNamespace(prefix);

    if (!namespace) {
      return;
    }

    for (const id of updates.invited) {
      namespace.members.push({ id, role: "invited" });
    }

    for (const id in updates.roleChanges) {
      const member = namespace.members.find((member) => member.id == id);

      if (!member) {
        continue;
      }

      member.role = updates.roleChanges[id] as Role;
    }

    namespace.members = namespace.members.filter(
      (member) => !updates.removed.includes(member.id)
    );

    namespace.members = _.uniqBy(namespace.members, (member) => member.id);
  }

  async deleteNamespace(prefix: string): Promise<void> {
    const index = this.data.namespaces.findIndex(
      (namespace) => namespace.prefix == prefix
    );

    this.data.namespaces.splice(index, 1);
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

    try {
      await pipeline(stream, writeStream);
    } catch (err) {
      // throw out new upload
      await fsPromises.rm(writeStream.path);
      throw err;
    }

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

    try {
      await pipeline(stream, writeStream);
    } catch (err) {
      // throw out new upload
      await fsPromises.rm(writeStream.path);
      throw err;
    }
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

  async countPackageUploadsForUser(
    id: unknown,
    startDate: Date
  ): Promise<number> {
    return this.data.packages.filter((p) => {
      return p.creator == id && p.creation_date > startDate;
    }).length;
  }

  async createBugReport(type: string, content: string): Promise<void> {
    this.data.bugReports.push({ type, content, creation_date: new Date() });
  }

  listBugReports(): AsyncGenerator<BugReport> {
    const bugReports = [...this.data.bugReports];

    return (async function* () {
      for (let i = 0; i < bugReports.length; i++) {
        yield bugReports[i];
      }
    })();
  }
}
