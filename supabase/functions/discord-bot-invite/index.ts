import { getDiscordBotToken } from "../_shared/discord-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Public: returns the bot's identity (username/avatar) and a one-click invite
// URL. No auth needed — everything here is public bot info.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const token = await getDiscordBotToken();
    if (!token) {
      return json({ ok: false, error: "Discord bot is not configured yet" });
    }

    const meRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${token}` },
    });
    const me = await meRes.json().catch(() => null);
    if (!meRes.ok || !me?.id) {
      return json({ ok: false, error: `Discord rejected the bot token (${meRes.status})` });
    }

    // Invite works for any server — no guild ID needed.
    const appId = Deno.env.get("DISCORD_APPLICATION_ID") ?? me.id;
    // ViewChannel, SendMessages, EmbedLinks, ReadHistory, ManageMessages,
    // Kick, Ban, ManageNicknames, ManageRoles, Mute, Deafen, Move, Moderate
    const permissions = "1099943734278";
    const inviteUrl =
      `https://discord.com/oauth2/authorize?client_id=${appId}&scope=bot%20applications.commands&permissions=${permissions}`;

    return json({
      ok: true,
      bot: { id: me.id, username: me.username, discriminator: me.discriminator, avatar: me.avatar },
      inviteUrl,
    });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message });
  }
});
