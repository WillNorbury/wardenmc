// Sends a Discord DM about a new application to every staff member with role
// owner, manager, or admin who has a linked Discord account.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getDiscordBotToken } from "../_shared/discord-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const NOTIFY_ROLES = ["owner", "manager", "admin"] as const;

async function discordFetch(path: string, token: string, init: RequestInit = {}) {
  return fetch(`https://discord.com/api/v10${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

async function dmUser(discordId: string, payload: unknown, token: string) {
  const ch = await discordFetch("/users/@me/channels", token, {
    method: "POST",
    body: JSON.stringify({ recipient_id: discordId }),
  });
  if (!ch.ok) return { ok: false, status: ch.status, body: await ch.text() };
  const channel = await ch.json();
  const msg = await discordFetch(`/channels/${channel.id}/messages`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!msg.ok) return { ok: false, status: msg.status, body: await msg.text() };
  return { ok: true, status: msg.status, body: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const token = await getDiscordBotToken();
    if (!token) return json({ ok: false, error: "DISCORD_BOT_TOKEN not configured" }, 500);

    // Caller must be signed in, and either own the application or be staff.
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ ok: false, error: "unauthorized" }, 401);
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData } = await sb.auth.getUser();
    if (!userData?.user) return json({ ok: false, error: "unauthorized" }, 401);
    const callerId = userData.user.id;

    const { applicationId } = await req.json().catch(() => ({}));
    if (!applicationId || typeof applicationId !== "string") {
      return json({ ok: false, error: "applicationId required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: app, error: appErr } = await admin
      .from("applications")
      .select("id, type, mc_username, discord, age, timezone, experience, why, portfolio_url, user_id, created_at")
      .eq("id", applicationId)
      .maybeSingle();
    if (appErr) return json({ ok: false, error: appErr.message }, 500);
    if (!app) return json({ ok: false, error: "Application not found" }, 404);

    if (app.user_id !== callerId) {
      const { data: staffRole } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", callerId)
        .in("role", ["owner", "manager", "admin"])
        .limit(1);
      if (!staffRole?.length) return json({ ok: false, error: "forbidden" }, 403);
    }

    const { data: staffRows, error: rolesErr } = await admin
      .from("user_roles")
      .select("user_id")
      .in("role", NOTIFY_ROLES as unknown as string[]);
    if (rolesErr) return json({ ok: false, error: rolesErr.message }, 500);

    const userIds = Array.from(new Set((staffRows ?? []).map((r) => r.user_id)));
    if (userIds.length === 0) return json({ ok: true, sent: 0, skipped: 0, reason: "no staff" });

    const { data: profiles, error: profErr } = await admin
      .from("profiles_private")
      .select("user_id, discord_id")
      .in("user_id", userIds);
    if (profErr) return json({ ok: false, error: profErr.message }, 500);

    const recipients = (profiles ?? [])
      .filter((p) => p.discord_id)
      .map((p) => ({ id: p.user_id, discord_id: p.discord_id }));

    const trunc = (s: string | null | undefined, n = 1024) =>
      !s ? "—" : s.length > n ? s.slice(0, n - 1) + "…" : s;

    const fields = [
      { name: "Minecraft", value: app.mc_username ?? "—", inline: true },
      { name: "Discord", value: app.discord || "—", inline: true },
      { name: "Type", value: String(app.type ?? "—"), inline: true },
      { name: "Age", value: app.age != null ? String(app.age) : "—", inline: true },
      { name: "Timezone", value: app.timezone || "—", inline: true },
      { name: "Portfolio", value: app.portfolio_url || "—", inline: true },
      { name: "Why", value: trunc(app.why) },
    ];
    if (app.experience) fields.push({ name: "Experience", value: trunc(app.experience) });

    const payload = {
      content: `📩 New **${app.type}** application from **${app.mc_username}**`,
      embeds: [
        {
          title: `New ${app.type} application`,
          color: 0xff6a1a,
          fields,
          timestamp: app.created_at ?? new Date().toISOString(),
          footer: { text: "Review in admin → Applications" },
        },
      ],
    };

    let sent = 0;
    const errors: { user_id: string; status: number; body: string | null }[] = [];
    for (const p of recipients) {
      const r = await dmUser(p.discord_id!, payload, token);
      if (r.ok) sent++;
      else errors.push({ user_id: p.id, status: r.status, body: r.body });
    }

    return json({
      ok: errors.length === 0,
      sent,
      skipped: userIds.length - recipients.length,
      errors,
    });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
