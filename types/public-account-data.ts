import { Account } from "./account";

export type PublicAccountData = {
  id: unknown;
  admin?: boolean;
  banned?: boolean;
  username: string;
  avatar: string;
};

export function intoPublicAccount(account: Account) {
  return {
    id: account.id,
    admin: account.admin,
    banned: account.banned,
    username: account.username,
    avatar: account.avatar,
  };
}
