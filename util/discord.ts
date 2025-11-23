import discord from "discord.js";

type DiscordUser = {
  id: string; // the user's id
  username: string; // the user's username, not unique across the platform
  discriminator: string; // the user's 4-digit discord-tag
  avatar?: string; // the user's avatar hash
};

export async function fetchDiscordUser(token: string) {
  const rest = new discord.REST({ version: "10", authPrefix: "Bearer" });
  rest.setToken(token);

  return (await rest.get(discord.Routes.user())) as DiscordUser;
}
