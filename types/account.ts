export type AccountIdNameMap = { [id: string]: string };

export type Account = {
  id?: unknown;
  admin?: boolean;
  banned?: boolean;
  username: string;
  normalized_username: string;
  discord_id?: string;
  avatar: string;
};

export function normalizeUsername(name: string) {
  return name.toLowerCase();
}
