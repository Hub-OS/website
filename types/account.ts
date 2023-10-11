export type AccountIdNameMap = { [id: string]: string };

export type Account = {
  id?: unknown;
  username: string;
  normalized_username: string;
  discord_id?: string;
  avatar: string;
};

export function normalizeUsername(name: string) {
  return name.toLowerCase();
}
