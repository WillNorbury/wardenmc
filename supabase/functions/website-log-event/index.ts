import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Payload {
  kind: string;
  title: string;
  detail?: string;
  url?: string;
  actor?: string;
  color?: number;
}

// Kinds an anonymous visitor may legitimately trigger (contact form, ban
// appeal, owner mailto). Everything else (admin activity logs) requires a
// verified staff role so members cannot forge staff actions.
const PUBLIC_KINDS = new Set(["contact_message", "ban_appeal_new", "owner_contact"]);

const cap = (v: unknown, n: number): string | undefined =>
  typeof v === "string" && v.length ? v.slice(0, n) : undefined;

async function callerId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data } = await sb.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Payload;
    if (!body?.kind || !body?.title) {
      return new Response(JSON.stringify({ error: "kind and title required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const kind = String(body.kind).slice(0, 40);
    if (!/^[a-z0-9_]+$/.test(kind)) {
      return new Response(JSON.stringify({ error: "invalid kind" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uid = await callerId(req);
    if (!uid && !PUBLIC_KINDS.has(kind)) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const title = cap(body.title, 120)!;
    const detail = cap(body.detail, 500);
    let linkUrl = cap(body.url, 300);
    if (linkUrl && !/^https?:\/\//i.test(linkUrl) && !linkUrl.startsWith("/")) linkUrl = undefined;
    const actor = cap(body.actor, 80);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (!PUBLIC_KINDS.has(kind)) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid).in("role", ["admin", "owner", "founder", "star"]).limit(1);
      if (!roles?.length) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Resolve webhook URL
    const { data: alertSettings } = await supabase
      .from("alert_settings")
      .select("webhook_urls")
      .eq("id", 1)
      .maybeSingle();

    const urls = (alertSettings?.webhook_urls ?? []) as string[];
    const url = urls[0];
    if (!url || !/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ skipped: true, reason: "no webhook url" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = {
      embeds: [
        {
          title,
          description: detail ?? "",
          color: typeof body.color === "number" ? body.color : 0x3b82f6,
          url: linkUrl,
          fields: [
            { name: "Event", value: kind, inline: true },
            ...(actor ? [{ name: "By", value: actor, inline: true }] : []),
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const started = Date.now();
    let status = 0;
    let ok = false;
    let error: string | null = null;
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      status = resp.status;
      ok = resp.ok;
      if (!resp.ok) error = await resp.text().catch(() => `HTTP ${resp.status}`);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    const latency_ms = Date.now() - started;

    await supabase.from("website_webhook_deliveries").insert({
      kind,
      url_host: (() => {
        try { return new URL(url).host; } catch { return null; }
      })(),
      status_code: status || null,
      ok,
      error,
      latency_ms,
    });

    return new Response(JSON.stringify({ ok, status, error, latency_ms }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
