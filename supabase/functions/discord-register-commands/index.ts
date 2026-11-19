// One-shot helper to register the /rules slash command globally.
// Invoke from the admin tab; admin-only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getDiscordBotToken } from "../_shared/discord-token.ts";
import { moderationRegistrations } from "../_shared/moderation-commands.ts";
import { statusRegistration } from "../_shared/discord-status-model.ts";
import { applyRegistration, setApplyRegistration } from "../_shared/discord-apply-model.ts";
import { addCommandRegistration, listCommandsRegistration, removeCommandRegistration } from "../_shared/discord-custom-commands-model.ts";
import { aboutRegistration } from "../_shared/discord-about-model.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";


const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const input = await req.json().catch(() => ({}));
    if (!input || typeof input !== "object" || (input.about_only !== undefined && typeof input.about_only !== "boolean") || (input.guild_id !== undefined && (typeof input.guild_id !== "string" || !/^\d{5,25}$/.test(input.guild_id)))) return json({ error: "Invalid registration options" }, 400);
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ ok: false, error: "Unauthorized" }, 401);
    const { data: role } = await userClient
      .from("user_roles").select("role").eq("user_id", u.user.id).in("role", ["admin", "owner", "founder", "star"]).limit(1).maybeSingle();
    if (!role) return json({ ok: false, error: "Admin only" }, 403);

    const appId = Deno.env.get("DISCORD_APPLICATION_ID");
    const token = await getDiscordBotToken();
    if (!appId || !token) return json({ ok: false, error: "Missing DISCORD_APPLICATION_ID or DISCORD_BOT_TOKEN" }, 400);

    // Upsert only /about in each guild: never bulk-overwrite per-server custom commands.
    const guildResults: { guild_id: string; ok: boolean; status: number }[] = [];
    let after = "";
    do {
      let guilds: { id: string }[];
      if (input.guild_id) guilds = [{ id: input.guild_id }];
      else {
        const page = await fetch(`https://discord.com/api/v10/users/@me/guilds?limit=200${after ? `&after=${after}` : ""}`, { headers: { Authorization: `Bot ${token}` }, signal: AbortSignal.timeout(10000) });
        if (!page.ok) { await page.text(); return json({ ok: false, error: "Could not list WardenBot servers", status: page.status }, 502); }
        guilds = await page.json();
      }
      for (const guild of guilds) {
        const registered = await fetch(`https://discord.com/api/v10/applications/${appId}/guilds/${guild.id}/commands`, { method: "POST", headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(aboutRegistration), signal: AbortSignal.timeout(10000) });
        await registered.text();
        guildResults.push({ guild_id: guild.id, ok: registered.ok, status: registered.status });
      }
      after = !input.guild_id && guilds.length === 200 ? guilds[guilds.length - 1]?.id ?? "" : "";
    } while (after);
    if (guildResults.some((g) => !g.ok)) return json({ ok: false, guild_commands: guildResults }, 502);
    if (input.about_only) return json({ ok: true, guild_commands: guildResults });
    // Commands are configured in the admin panel (site_content -> discord_commands).
    const { data: cfgRow } = await userClient
      .from("site_content").select("value").eq("key", "discord_commands").maybeSingle();
    const configured = Array.isArray((cfgRow?.value as any)?.commands)
      ? ((cfgRow?.value as any).commands as any[])
      : [];
    const fromConfig = configured
      .filter((c) => c && c.enabled !== false && typeof c.name === "string" && c.name.trim())
      .map((c) => ({
        name: String(c.name).toLowerCase().slice(0, 32),
        description: String(c.description ?? "").slice(0, 100) || "Warden Network command",
        type: 1,
      }));
    const cmds = fromConfig.length > 0 ? fromConfig : [
      { name: "rules", description: "Show the Warden Network server rules", type: 1 },
      { name: "subscribe", description: "Subscribe to email notifications from Warden Network", type: 1 },
      { name: "unsubscribe", description: "Unsubscribe from email notifications from Warden Network", type: 1 },
    ];
    const modNames = new Set(moderationRegistrations().map((m) => m.name));
    const builtIn = new Set([...modNames, "status", "setapply", "apply", "addcommand", "removecommand", "commands", "about"]);
    const allCmds = [...cmds.filter((c) => !builtIn.has(c.name)), ...moderationRegistrations(), statusRegistration, setApplyRegistration, applyRegistration, addCommandRegistration, removeCommandRegistration, listCommandsRegistration];
    const r = await fetch(`https://discord.com/api/v10/applications/${appId}/commands`, {
      method: "PUT",
      headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(allCmds),
    });
    const data = await r.json().catch(() => ({}));
    return json(r.ok ? { ok: true, registered: data, guild_commands: guildResults } : { ok: false, status: r.status, details: data }, r.ok ? 200 : 500);
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
