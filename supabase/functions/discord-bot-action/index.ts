import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getDiscordBotToken } from "../_shared/discord-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

type Action = "announce" | "status" | "welcome" | "roles" | "info" | "rules";

const SITE_ROLES: { value: string; label: string; description: string }[] = [
  { value: "owner", label: "Owner", description: "Server founder with full administrative authority." },
  { value: "manager", label: "Manager", description: "Oversees staff teams and day-to-day operations." },
  { value: "developer", label: "Developer", description: "Builds and maintains plugins, systems, and integrations." },
  { value: "sr_admin", label: "Sr Admin", description: "Senior administrator handling escalations and policy." },
  { value: "admin", label: "Admin", description: "Administrator with elevated moderation powers." },
  { value: "jr_admin", label: "Jr Admin", description: "Junior administrator in training." },
  { value: "sr_mod", label: "Sr Mod", description: "Senior moderator leading the moderation team." },
  { value: "mod", label: "Mod", description: "Moderator enforcing the server rules." },
  { value: "sr_helper", label: "Sr Helper", description: "Senior helper guiding the helper team." },
  { value: "helper", label: "Helper", description: "Helps players in chat and support channels." },
  { value: "champion", label: "Champion", description: "Top-tier supporter with exclusive perks." },
  { value: "media", label: "Media", description: "Content creators and partnered streamers." },
  { value: "elite", label: "Elite", description: "Elite donor rank with premium benefits." },
  { value: "mvp", label: "MVP", description: "MVP donor rank for dedicated supporters." },
  { value: "vip", label: "VIP", description: "VIP donor rank with extra perks." },
  { value: "booster", label: "Booster", description: "Discord server booster — thank you!" },
  { value: "default", label: "Default", description: "Default member role." },
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function discordPost(channelId: string, token: string, payload: unknown) {
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function discordPatch(channelId: string, messageId: string, token: string, payload: unknown) {
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function buildStatusEmbed(mc: any, serverIp: string) {
  const online = !!mc?.online;
  const motd = Array.isArray(mc?.motd?.clean) ? mc.motd.clean.join(" ") : null;
  const version = mc?.version ?? "—";
  const players = `${mc?.players?.online ?? 0} / ${mc?.players?.max ?? 0}`;
  return {
    title: online ? "🟢 Warden Network — Online" : "🔴 Warden Network — Offline",
    description: motd ? `*${motd}*` : undefined,
    color: online ? 0x22c55e : 0xef4444,
    fields: [
      { name: "Status", value: online ? "Live" : "Down", inline: true },
      { name: "Players", value: players, inline: true },
      { name: "Version", value: String(version), inline: true },
      { name: "IP", value: `\`${serverIp}\``, inline: false },
    ],
    footer: { text: "Warden Network · Live status (auto-updated)" },
    timestamp: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const cronSecret = req.headers.get("x-cron-secret") ?? "";

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let isCron = false;
    if (cronSecret) {
      const { data: secretRow } = await adminClient
        .from("site_content")
        .select("value")
        .eq("key", "cron_secret")
        .maybeSingle();
      const expected = (secretRow?.value as any)?.value;
      isCron = !!expected && cronSecret === expected;
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const supabase = isCron ? adminClient : userClient;

    let callerName = "tester";
    if (!isCron) {
      const { data: userData } = await userClient.auth.getUser();
      if (!userData?.user) return json({ ok: false, error: "Unauthorized" }, 401);
      const { data: roleRow } = await userClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleRow) return json({ ok: false, error: "Forbidden — admin only" }, 403);
      callerName = userData.user.user_metadata?.display_name || userData.user.email || "tester";
    }

    const token = await getDiscordBotToken();
    if (!token) return json({ ok: false, error: "DISCORD_BOT_TOKEN secret is not configured" });

    const body = await req.json().catch(() => ({}));
    const action: Action = body?.action;
    if (!["announce", "status", "welcome", "roles", "info", "rules"].includes(action)) {
      return json({ ok: false, error: "Invalid action" }, 400);
    }

    const { data: cfgRow } = await supabase.from("site_content").select("value").eq("key", "discord_bot").maybeSingle();
    const cfg: any = cfgRow?.value ?? {};

    const { data: embedRow } = await supabase.from("site_content").select("value").eq("key", "discord_embeds").maybeSingle();
    const embedOverrides: any = embedRow?.value ?? {};
    const applyOverride = (embed: any, key: "info" | "rules" | "roles") => {
      const o = embedOverrides?.[key];
      if (!o || typeof o !== "object") return embed;
      if (typeof o.title === "string" && o.title.trim()) embed.title = o.title;
      if (typeof o.description === "string" && o.description.trim()) embed.description = o.description;
      if (typeof o.color === "string" && /^#?[0-9a-fA-F]{6}$/.test(o.color)) {
        embed.color = parseInt(o.color.replace("#", ""), 16);
      } else if (typeof o.color === "number") {
        embed.color = o.color;
      }
      if (typeof o.footerText === "string" && o.footerText.trim()) {
        embed.footer = { ...(embed.footer ?? {}), text: o.footerText };
      }
      if (Array.isArray(o.fields) && o.fields.length > 0) {
        embed.fields = o.fields
          .filter((f: any) => f && (typeof f.name === "string") && (typeof f.value === "string"))
          .map((f: any) => ({ name: f.name, value: f.value, inline: !!f.inline }));
      }
      return embed;
    };

    if (action === "announce") {
      const channelId = body.channelId || cfg.announceChannelId;
      const message = body.message || "📢 **Test announcement** from the Warden Network admin panel.";
      if (!channelId) return json({ ok: false, error: "No announcements channel configured" });
      const r = await discordPost(channelId, token, {
        embeds: [
          {
            title: "Announcement",
            description: message,
            color: 0x5865f2,
            footer: { text: "Warden Network · Test" },
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return json(
        r.ok
          ? { ok: true, message: `Announcement sent to channel ${channelId}` }
          : { ok: false, error: `Discord error ${r.status}`, details: r.data },
      );
    }

    if (action === "status") {
      const channelId = body.channelId || cfg.statusChannelId;
      if (!channelId) return json({ ok: false, error: "No status channel configured" });

      const { data: ipRow } = await supabase.from("site_content").select("value").eq("key", "server").maybeSingle();
      const serverIp = (ipRow?.value as any)?.ip ?? "play.xylomc.net";

      let mc: any = null;
      try {
        const r = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(serverIp)}`);
        mc = await r.json();
      } catch (_) {
        mc = null;
      }

      const embed = buildStatusEmbed(mc, serverIp);
      const existingId: string | undefined = cfg.statusMessageId;
      const sameChannel = cfg.statusMessageChannelId === channelId;

      let result;
      if (existingId && sameChannel) {
        result = await discordPatch(channelId, existingId, token, { embeds: [embed] });
        if (!result.ok && result.status === 404) {
          // Message was deleted — repost
          result = await discordPost(channelId, token, { embeds: [embed] });
          if (result.ok) {
            await adminClient.from("site_content").upsert({
              key: "discord_bot",
              value: { ...cfg, statusMessageId: result.data?.id, statusMessageChannelId: channelId },
            });
          }
        }
      } else {
        result = await discordPost(channelId, token, { embeds: [embed] });
        if (result.ok) {
          await adminClient.from("site_content").upsert({
            key: "discord_bot",
            value: { ...cfg, statusMessageId: result.data?.id, statusMessageChannelId: channelId },
          });
        }
      }

      return json(
        result.ok
          ? { ok: true, message: `Status ${existingId && sameChannel ? "updated" : "posted"} in channel ${channelId}` }
          : { ok: false, error: `Discord error ${result.status}`, details: result.data },
      );
    }

    if (action === "welcome") {
      const channelId = body.channelId || cfg.welcomeChannelId || cfg.announceChannelId;
      if (!channelId) return json({ ok: false, error: "No welcome channel configured" });
      const template = body.message || cfg.welcomeMessage || "Welcome to Warden Network, {user}!";
      const target = body.username || callerName;
      const rendered = template.replace(/\{user\}/g, `**${target}**`);
      const r = await discordPost(channelId, token, {
        content: `👋 *Welcome message preview:*\n${rendered}`,
      });
      return json(
        r.ok
          ? { ok: true, message: `Welcome preview sent to channel ${channelId}` }
          : { ok: false, error: `Discord error ${r.status}`, details: r.data },
      );
    }

    if (action === "roles") {
      const channelId = cfg.rolesChannelId || "1498961753457954847";
      if (!channelId) return json({ ok: false, error: "No roles channel configured" });

      const lines = SITE_ROLES.map((r) => `**${r.label}** — ${r.description}`).join("\n");
      const embed = applyOverride({
        title: "Warden Network — Server Roles",
        description: lines,
        color: 0x5865f2,
        footer: { text: "Warden Network · Roles overview" },
        timestamp: new Date().toISOString(),
      }, "roles");

      if (body.preview) {
        return json({ ok: true, preview: embed, channelId });
      }

      const existingId: string | undefined = cfg.rolesMessageId;
      const sameChannel = cfg.rolesMessageChannelId === channelId;

      let result;
      if (existingId && sameChannel) {
        result = await discordPatch(channelId, existingId, token, { embeds: [embed] });
        if (!result.ok && result.status === 404) {
          result = await discordPost(channelId, token, { embeds: [embed] });
          if (result.ok) {
            await adminClient.from("site_content").upsert({
              key: "discord_bot",
              value: {
                ...cfg,
                rolesChannelId: channelId,
                rolesMessageId: result.data?.id,
                rolesMessageChannelId: channelId,
              },
            });
          }
        }
      } else {
        result = await discordPost(channelId, token, { embeds: [embed] });
        if (result.ok) {
          await adminClient.from("site_content").upsert({
            key: "discord_bot",
            value: {
              ...cfg,
              rolesChannelId: channelId,
              rolesMessageId: result.data?.id,
              rolesMessageChannelId: channelId,
            },
          });
        }
      }

      return json(
        result.ok
          ? { ok: true, message: `Roles ${existingId && sameChannel ? "updated" : "posted"} in channel ${channelId}` }
          : { ok: false, error: `Discord error ${result.status}`, details: result.data },
      );
    }

    if (action === "info" || action === "rules") {
      // Resolve config keys per action
      const map = {
        info: {
          channelKey: "infoChannelId",
          msgIdKey: "infoMessageId",
          msgChKey: "infoMessageChannelId",
          fallbackChannel: "",
        },
        rules: {
          channelKey: "rulesChannelId",
          msgIdKey: "rulesMessageId",
          msgChKey: "rulesMessageChannelId",
          fallbackChannel: "",
        },
      } as const;
      const m = map[action];
      const channelId = body.channelId || cfg[m.channelKey] || m.fallbackChannel;
      if (!channelId) return json({ ok: false, error: `No ${action} channel configured` });

      // Server IP for info embed
      let serverIp = "xylomc.net";
      let bedrockIp = "Soon";
      let bedrockPort = "Soon";
      try {
        const { data: ipRow } = await supabase.from("site_content").select("value").eq("key", "server").maybeSingle();
        if (ipRow?.value) {
          serverIp = (ipRow.value as any)?.ip ?? serverIp;
          bedrockPort = (ipRow.value as any)?.bedrockPort ?? bedrockPort;
        }
      } catch (_) {
        /* ignore */
      }

      let embed: any;
      let content: string | undefined;

      if (action === "info") {
        embed = applyOverride({
          title: "🍸 Warden Network — Server Info",
          description:
            "Welcome to **Warden Network** — your home for premium survival, minigames, and community events.\n\nConnect using the details below and join the adventure!",
          color: 0xff7a1a,
          thumbnail: { url: "https://api.mcsrvstat.us/icon/" + encodeURIComponent(serverIp) },
          fields: [
            { name: "🌐 Java IP", value: `\`${serverIp}\``, inline: true },
            { name: "🌐 Bedrock IP", value: `\`${bedrockIp}\``, inline: true },
            { name: "🎮 Bedrock Port", value: `\`${bedrockPort}\``, inline: true },
            { name: "💎 Versions", value: "Java 1.21+", inline: false },
            {
              name: "🔗 Quick Links",
              value: "[Website](https://www.xylomc.net) · [Apply](https://www.xylomc.net/apply)",
              inline: false,
            },
          ],
          footer: { text: "Warden Network · See you in-game!" },
          timestamp: new Date().toISOString(),
        }, "info");
        content = body.mention === false ? undefined : "@everyone";
      } else {
        // rules — load sections from DB
        const { data: ruleRows } = await supabase
          .from("rule_sections")
          .select("title, items, sort_order, published")
          .eq("published", true)
          .order("sort_order", { ascending: true });

        const fields = (ruleRows ?? []).map((s: any, idx: number) => ({
          name: `${idx + 1}. ${s.title}`,
          value: (s.items ?? []).map((it: string) => `• ${it}`).join("\n") || "—",
        }));

        embed = applyOverride({
          title: "📜 Warden Network Rules",
          description:
            "Please read and follow these rules. Violations may result in mutes, kicks, or bans at staff discretion.",
          color: 0xef4444,
          fields: fields.length > 0 ? fields : [{ name: "No rules", value: "No rules configured." }],
          footer: { text: "Warden Network · Updated regularly" },
          timestamp: new Date().toISOString(),
        }, "rules");
      }

      if (body.preview) {
        return json({ ok: true, preview: embed, content, channelId });
      }

      const existingId: string | undefined = cfg[m.msgIdKey];
      const sameChannel = cfg[m.msgChKey] === channelId;
      const payload: any = { embeds: [embed] };
      if (content) payload.content = content;

      let result;
      if (existingId && sameChannel) {
        // PATCH cannot change content+mentions reliably; just patch embeds
        result = await discordPatch(channelId, existingId, token, { embeds: [embed] });
        if (!result.ok && result.status === 404) {
          result = await discordPost(channelId, token, payload);
          if (result.ok) {
            await adminClient.from("site_content").upsert({
              key: "discord_bot",
              value: { ...cfg, [m.channelKey]: channelId, [m.msgIdKey]: result.data?.id, [m.msgChKey]: channelId },
            });
          }
        }
      } else {
        result = await discordPost(channelId, token, payload);
        if (result.ok) {
          await adminClient.from("site_content").upsert({
            key: "discord_bot",
            value: { ...cfg, [m.channelKey]: channelId, [m.msgIdKey]: result.data?.id, [m.msgChKey]: channelId },
          });
        }
      }

      return json(
        result.ok
          ? {
              ok: true,
              message: `${action === "info" ? "Info" : "Rules"} ${existingId && sameChannel ? "updated" : "posted"} in channel ${channelId}`,
            }
          : { ok: false, error: `Discord error ${result.status}`, details: result.data },
      );
    }

    return json({ ok: false, error: "Unhandled action" }, 400);
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
