export const DEFAULT_ABOUT_MESSAGE = "Meet WardenBot — your server’s management assistant. Set up welcome messages, reaction roles, AutoMod, timed messages, custom commands, and more through the dashboard: https://bot.warden.rip";
export type AboutSettings = { channel_id: string | null; message: string; enabled: boolean };
export const DEFAULT_ABOUT_SETTINGS: AboutSettings = { channel_id: null, message: DEFAULT_ABOUT_MESSAGE, enabled: true };
export const aboutRegistration = {
  name: "about", description: "Post WardenBot’s introduction (server owner only)", type: 1,
  options: [{ name: "channel", description: "Text or announcement channel (required on first use)", type: 7, required: false, channel_types: [0, 5] }],
};
export function sanitizeAboutSettings(input: unknown): AboutSettings {
  const raw = input && typeof input === "object" ? input as Record<string, unknown> : {};
  return {
    channel_id: typeof raw.channel_id === "string" && /^\d{5,25}$/.test(raw.channel_id) ? raw.channel_id : null,
    message: typeof raw.message === "string" && raw.message.trim() && raw.message.trim().length <= 2000 ? raw.message.trim() : DEFAULT_ABOUT_MESSAGE,
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : true,
  };
}
export function isAboutChannel(channel: unknown, guildId: string): boolean {
  if (!channel || typeof channel !== "object") return false;
  const raw = channel as Record<string, unknown>;
  return raw.guild_id === guildId && (raw.type === 0 || raw.type === 5);
}
type Interaction = { guild_id?: string; channel_id?: string; member?: { user?: { id?: string } }; data?: { options?: { name: string; type: number; value: unknown }[] } };
export type AboutDependencies = {
  discord: (method: string, path: string, payload?: unknown) => Promise<Response>;
  load: (guildId: string) => Promise<unknown>;
  save: (guildId: string, userId: string, settings: AboutSettings) => Promise<void>;
};
/** Called only after Discord signature validation; guild ownership is fetched, never inferred from permissions. */
export async function runAboutCommand(body: Interaction, deps: AboutDependencies): Promise<string> {
  const guildId = body.guild_id, userId = body.member?.user?.id;
  if (!guildId || !userId || !/^\d{5,25}$/.test(guildId) || !/^\d{5,25}$/.test(userId)) return "Use /about in a Discord server.";
  const guildRes = await deps.discord("GET", `/guilds/${guildId}`);
  if (!guildRes.ok) { await guildRes.text(); return "Could not verify the server owner. Try again shortly."; }
  const guild = await guildRes.json();
  if (guild.owner_id !== userId) return "Only this Discord server’s owner can use /about.";
  const options = body.data?.options ?? [];
  const selected = options.find((o) => o.name === "channel");
  if (options.some((o) => o.name !== "channel") || (selected && (selected.type !== 7 || typeof selected.value !== "string" || !/^\d{5,25}$/.test(selected.value)))) return "Choose a valid text or announcement channel.";
  const settings = sanitizeAboutSettings(await deps.load(guildId));
  const channelId = selected ? selected.value as string : settings.channel_id;
  if (!channelId) return "On first use, choose a text or announcement channel with /about channel:#channel.";
  const channelRes = await deps.discord("GET", `/channels/${channelId}`);
  if (!channelRes.ok) { await channelRes.text(); return "Could not access that channel. Choose a channel WardenBot can view."; }
  const channel = await channelRes.json();
  if (!isAboutChannel(channel, guildId)) return "Choose a text or announcement channel belonging to this server.";
  if (!settings.enabled) return "The About module is disabled. Enable it through the dashboard before posting.";
  const next = { ...settings, channel_id: channelId };
  await deps.save(guildId, userId, next);
  const posted = await deps.discord("POST", `/channels/${channelId}/messages`, {
    content: next.message, allowed_mentions: { parse: [], users: [], roles: [], replied_user: false },
  });
  const ok = posted.ok;
  await posted.text();
  if (!ok) return "Could not post the About message. WardenBot needs View Channel and Send Messages permissions in the saved channel.";
  return `Posted in <#${channelId}>.`;
}