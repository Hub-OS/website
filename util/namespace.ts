import { Account } from "./account";

export type Role = "admin" | "collaborator" | "invited";
export type Member = {
  id: Account["id"];
  role: Role;
};

export type Namespace = {
  prefix: string;
  registered: boolean;
  members: Member[];
};

export type MemberUpdates = {
  invited: Account["id"][];
  removed: Account["id"][];
  roleChanges: { [id: string]: string };
};

export const SYMBOL_REGEX = /[^A-z0-9]/;
