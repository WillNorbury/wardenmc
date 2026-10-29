// Discord Interactions endpoint — handles slash commands.
// Configure this URL as the "Interactions Endpoint URL" in your Discord app:
//   https://<project-ref>.functions.supabase.co/discord-interactions
import nacl from "https://esm.sh/tweetnacl@1.0.3";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildRulesEmbed as formatRulesEmbed } from "../_shared/rules-embed.ts";
import { handleModeration, isFunCommand } from "../_shared/moderation-commands.ts";
import { completeStatusInteraction } from "../_shared/discord-status.ts";
import { canSetupStatus, statusSetupInput } from "../_shared/discord-status-model.ts";
import { getApplyUrl, setApplyUrl } from "../_shared/discord-apply.ts";
import { loadReplyTexts, renderReply } from "../_shared/discord-reply-texts.ts";
import { addCustomCommand, getCustomCommandResponse, listCustomCommands, removeCustomCommand } from "../_shared/discord-custom-commands.ts";
import { completeDeferredReply, deferredReply } from "../_shared/discord-deferred.ts";
import { moderationReplyState, type ModerationOutcome } from "../_shared/discord-moderation-outcome.ts";

const PUBLIC_KEY = Deno.env.get("DISCORD_PUBLIC_KEY") ?? "";

const InteractionType = { PING: 1, APPLICATION_COMMAND: 2 };
const InteractionResponseType = { PONG: 1, CHANNEL_MESSAGE_WITH_SOURCE: 4 };

function hexToBytes(hex: string) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

async function verify(req: Request, rawBody: string) {
  const sig = req.headers.get("x-signature-ed25519");
  const ts = req.headers.get("x-signature-timestamp");
  if (!sig || !ts || !PUBLIC_KEY) return false;
  try {
    return nacl.sign.detached.verify(
      new TextEncoder().encode(ts + rawBody),
      hexToBytes(sig),
      hexToBytes(PUBLIC_KEY),
    );
  } catch {
    return false;
  }
}

async function buildRulesEmbed() {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: rows } = await supabase
    .from("rule_sections")
    .select("title, items, sort_order")
    .eq("published", true)
    .order("sort_order", { ascending: true });

  return formatRulesEmbed(rows ?? []);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const raw = await req.text();
  if (!(await verify(req, raw))) return new Response("invalid request signature", { status: 401 });

  let body: any;
  try { body = JSON.parse(raw); } catch { return new Response("Invalid JSON", { status: 400 }); }
  if (body.type === InteractionType.PING) {
    return new Response(JSON.stringify({ type: InteractionResponseType.PONG }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (body.type === InteractionType.APPLICATION_COMMAND) {
    // Discord's 3-second deadline includes database lookups and cold starts.
    // Defer privately before network work; completion preserves handler visibility.
    if (body.data?.name === "status") {
      EdgeRuntime.waitUntil(completeStatusInteraction(body));
    } else {
      EdgeRuntime.waitUntil(completeDeferredReply(body, () => handleApplicationCommand(body)));
    }
    return deferredReply();
  }

  return new Response("ok");
});

async function handleApplicationCommand(body: any): Promise<Response> {
    const name = body.data?.name;

    // Website-editable reply texts (site_content -> discord_command_replies).
    const texts = await loadReplyTexts(createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    ), body.guild_id);
    const t = (key: Parameters<typeof renderReply>[1], vars: Record<string, string> = {}) => renderReply(texts, key, vars);

    if (name === "setapply") {
      const reply = await setApplyUrl(body, texts);
      const ok = reply.startsWith("✅");
      return new Response(JSON.stringify({ type: 4, data: { content: reply, ...(ok ? {} : { flags: 64 }) } }), { headers: { "Content-Type": "application/json" } });
    }
    if (name === "apply") {
      const reply = await getApplyUrl(body, texts);
      return new Response(JSON.stringify({ type: 4, data: { content: reply, flags: 64 } }), { headers: { "Content-Type": "application/json" } });
    }

    if (name === "addcommand" || name === "removecommand") {
      const reply = name === "addcommand" ? await addCustomCommand(body) : await removeCustomCommand(body);
      const ok = reply.startsWith("✅");
      return new Response(JSON.stringify({ type: 4, data: { content: reply, ...(ok ? {} : { flags: 64 }) } }), { headers: { "Content-Type": "application/json" } });
    }
    if (name === "commands") {
      const reply = await listCustomCommands(body);
      return new Response(JSON.stringify({ type: 4, data: { content: reply, flags: 64 } }), { headers: { "Content-Type": "application/json" } });
    }

    // Admin-configured commands (site_content -> discord_commands)
    const cfgClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: cmdRow } = await cfgClient
      .from("site_content").select("value").eq("key", "discord_commands").maybeSingle();
    const configured: any[] = Array.isArray((cmdRow?.value as any)?.commands)
      ? (cmdRow?.value as any).commands
      : [];
    const cmd = configured.find((c) => c?.name === name);
    const say = (content: string, ephemeral = true) => new Response(
      JSON.stringify({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content, ...(ephemeral ? { flags: 64 } : {}) },
      }),
      { headers: { "Content-Type": "application/json" } },
    );

    const outcome: ModerationOutcome = {};
    const modReply = await handleModeration(body, texts, outcome);
    if (modReply !== null) {
      const state = moderationReplyState(name, modReply, outcome);
      // Record moderation actions so they show on the Admin dashboard.
      if (!isFunCommand(body.data?.name) && body.data?.name !== "help") try {
        const opts = Object.fromEntries((body.data?.options ?? []).map((x: any) => [x.name, x.value]));
        const failed = state.failed;
        await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
          .from("discord_bot_action_logs").insert({
            action: `/${body.data?.name}`,
            status: failed ? "error" : "success",
            error: failed ? modReply.slice(0, 300) : null,
            channel_id: body.channel_id ?? null,
            request: { target: opts.user ?? opts.user_id ?? null, reason: opts.reason ?? null, moderator: body.member?.user?.username ?? null },
            response: { reply: modReply.slice(0, 300) },
          });
      } catch (e) { console.warn("mod log failed", e); }
      return say(modReply, !state.public);
    }

    if (cmd && cmd.enabled === false) {
      return say(t("command_disabled"));
    }
    if (cmd && cmd.kind === "text") {
      const who = body.member?.user?.username ?? body.user?.username ?? "there";
      const text = String(cmd.response ?? "").replace(/\{user\}/g, who) || "…";
      return say(text, !!cmd.ephemeral);
    }
    if (name === "rules") {
      const embed = await buildRulesEmbed();
      return new Response(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { embeds: [embed] },
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }
    if (name === "subscribe" || name === "unsubscribe") {
      const subscribed = name === "subscribe";
      const discordId = body.member?.user?.id ?? body.user?.id;
      const reply = (content: string) => new Response(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content, flags: 64 },
        }),
        { headers: { "Content-Type": "application/json" } },
      );
      if (!discordId) return reply(t("subscribe_no_account"));

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: link } = await supabase
        .from("profiles_private")
        .select("user_id, preferences")
        .eq("discord_id", discordId)
        .maybeSingle();

      if (!link) {
        return reply(t("subscribe_not_linked"));
      }

      const prefs = { ...((link as any).preferences ?? {}), email_subscribed: subscribed };
      const { error } = await supabase
        .from("profiles_private")
        .update({ preferences: prefs })
        .eq("user_id", link.user_id);


      if (error) return reply(t("subscribe_failed", { error: error.message }));
      return reply(subscribed ? t("subscribe_done") : t("unsubscribe_done"));
    }
    // Per-server custom reply commands (added with /addcommand).
    const customReply = await getCustomCommandResponse(body);
    if (customReply) return say(customReply, false);

    return new Response(
      JSON.stringify({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: t("unknown_command"), flags: 64 },
      }),
      { headers: { "Content-Type": "application/json" } },
    );
}
