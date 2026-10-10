import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getDiscordBotToken } from "../_shared/discord-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NEW_MOD_CHANNEL_ID = "1509702647962402897";
const SITE_BASE = "https://www.xylomc.net";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ ok: false, error: "Unauthorized" }, 401);
    const { data: roleRow } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ ok: false, error: "Forbidden — admin only" }, 403);

    const token = await getDiscordBotToken();
    if (!token) return json({ ok: false, error: "DISCORD_BOT_TOKEN not configured" }, 500);

    const body = await req.json().catch(() => ({}));
    const {
      name,
      slug,
      description,
      author,
      loader,
      mc_version,
      version,
      category,
      icon_url,
      tags,
    } = body ?? {};

    if (!name || !slug) return json({ ok: false, error: "name and slug required" }, 400);

    const url = `${SITE_BASE}/mod/${slug}`;

    const fields: any[] = [];
    if (author) fields.push({ name: "Author", value: String(author), inline: true });
    if (loader) fields.push({ name: "Loader", value: String(loader), inline: true });
    if (mc_version) fields.push({ name: "MC Version", value: String(mc_version), inline: true });
    if (version) fields.push({ name: "Version", value: `v${version}`, inline: true });
    if (category) fields.push({ name: "Category", value: String(category), inline: true });
    if (Array.isArray(tags) && tags.length > 0)
      fields.push({ name: "Tags", value: tags.slice(0, 8).join(", "), inline: false });

    const embed: any = {
      title: `🧩 New Mod: ${name}`,
      url,
      description: description || "A new mod has just been published on Warden Network.",
      color: 0xff7a1a,
      fields,
      footer: { text: "Warden Network · Mods" },
      timestamp: new Date().toISOString(),
    };
    if (icon_url) embed.thumbnail = { url: icon_url };

    const res = await fetch(
      `https://discord.com/api/v10/channels/${NEW_MOD_CHANNEL_ID}/messages`,
      {
        method: "POST",
        headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      },
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return json({ ok: false, error: `Discord error ${res.status}`, details: data }, 500);
    }
    return json({ ok: true, message: `Posted to <#${NEW_MOD_CHANNEL_ID}>` });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
