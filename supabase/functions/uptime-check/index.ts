import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { STATUS_URL } from '../_shared/site-urls.ts'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Check = {
  service_key: string;
  is_up: boolean;
  latency_ms: number | null;
  status_code: number | null;
  error: string | null;
};

const SERVICE_NAMES: Record<string, string> = {
  website: "Website",
  minecraft: "Minecraft Server",
  api: "API",
  panel: "Panel",
  discord: "Discord",
};

const SERVICE_ENDPOINTS: Record<string, string> = {
  website: "https://warden.rip",
  minecraft: "",
  api: "",
  panel: "https://dash.nightly.host",
  discord: "https://discord.gg/V8xYY2DasZ",
  portfolio: "https://portfolio.warden.rip",
};

async function checkHttp(
  service_key: string,
  url: string,
  expectOk = true,
  headers: Record<string, string> = {},
  followRedirects = true,
): Promise<Check> {
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    const r = await fetch(url, {
      signal: ctrl.signal,
      redirect: followRedirects ? "follow" : "manual",
      headers,
    });
    clearTimeout(t);
    await r.arrayBuffer().catch(() => {});
    const isRedirect = r.status >= 300 && r.status < 400;
    return {
      service_key,
      is_up: expectOk ? r.ok || (!followRedirects && isRedirect) : r.status < 500,
      latency_ms: Date.now() - start,
      status_code: r.status,
      error: null,
    };
  } catch (e) {
    return {
      service_key,
      is_up: false,
      latency_ms: Date.now() - start,
      status_code: null,
      error: String((e as Error).message || e).slice(0, 300),
    };
  }
}


async function checkMinecraft(service_key: string, host: string): Promise<Check> {
  const start = Date.now();
  try {
    const r = await fetch(`https://api.mcstatus.io/v2/status/java/${encodeURIComponent(host)}?query=false`);
    const j = await r.json();
    return {
      service_key,
      is_up: !!j.online,
      latency_ms: Date.now() - start,
      status_code: r.status,
      error: j.online ? null : "offline",
    };
  } catch (e) {
    return {
      service_key,
      is_up: false,
      latency_ms: Date.now() - start,
      status_code: null,
      error: String((e as Error).message || e).slice(0, 300),
    };
  }
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return `${days}d ${remHours}h ${mins}m`;
}

function interpolateTemplate(template: unknown, vars: Record<string, string>): unknown {
  if (typeof template === "string") {
    return template.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => vars[key] ?? `{{${key}}}`);
  }
  if (Array.isArray(template)) {
    return template.map((item) => interpolateTemplate(item, vars));
  }
  if (template && typeof template === "object") {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(template as Record<string, unknown>)) {
      obj[k] = interpolateTemplate(v, vars);
    }
    return obj;
  }
  return template;
}

async function sendWebhook(
  urls: string[],
  template: unknown,
  vars: Record<string, string>,
  fallbackBody: object,
): Promise<{ url: string; ok: boolean; status: number | null; error: string | null; latency_ms: number }[]> {
  if (urls.length === 0) return [];
  const payload = template ? interpolateTemplate(template, vars) : fallbackBody;
  const body = JSON.stringify(payload);
  return await Promise.all(
    urls.map(async (url) => {
      const start = Date.now();
      try {
        const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
        await r.arrayBuffer().catch(() => {});
        return {
          url,
          ok: r.ok,
          status: r.status,
          error: r.ok ? null : `HTTP ${r.status}`,
          latency_ms: Date.now() - start,
        };
      } catch (e) {
        console.error("webhook failed", url, e);
        return {
          url,
          ok: false,
          status: null,
          error: String((e as Error).message || e).slice(0, 300),
          latency_ms: Date.now() - start,
        };
      }
    }),
  );
}

async function logWebsiteDelivery(
  supabase: ReturnType<typeof createClient>,
  kind: string,
  websiteUrl: string,
  results: { url: string; ok: boolean; status: number | null; error: string | null; latency_ms: number }[],
) {
  const r = results.find((x) => x.url === websiteUrl);
  if (!r) return;
  let host: string | null = null;
  try {
    host = new URL(websiteUrl).host;
  } catch {
    /* ignore */
  }
  await supabase.from("website_webhook_deliveries").insert({
    kind,
    url_host: host,
    status_code: r.status,
    ok: r.ok,
    error: r.error,
    latency_ms: r.latency_ms,
  });
}

async function emailAdmins(
  supabase: ReturnType<typeof createClient>,
  payload: {
    title: string
    severity: 'info' | 'warning' | 'critical' | 'success'
    summary: string
    details: string
    link: string
    linkLabel: string
    idempotencyKey: string
    serviceName?: string
    endpoint?: string
    errorSnippet?: string
    duration?: string
    uptimeWindow?: string
  },
) {
  try {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'owner']);
    const ids = [...new Set((roles ?? []).map((r: any) => r.user_id).filter(Boolean))];
    if (ids.length === 0) return;
    const emails = new Set<string>();
    for (const id of ids) {
      const { data } = await (supabase.auth as any).admin.getUserById(id);
      const e = data?.user?.email;
      if (e) emails.add(e);
    }
    const envFallback = (Deno.env.get('ALERT_EMAIL') || '')
      .split(/[\s,;\n]+/).map((s) => s.trim()).filter(Boolean);
    for (const e of envFallback) emails.add(e);
    await Promise.all(
      [...emails].map((to) =>
        supabase.functions.invoke('send-app-email', {
          body: {
            templateName: 'admin-alert',
            recipientEmail: to,
            from: 'Warden Network Status <status@warden.rip>',
            idempotencyKey: `${payload.idempotencyKey}-${to}`,
            templateData: {
              title: payload.title,
              severity: payload.severity,
              summary: payload.summary,
              details: payload.details,
              link: payload.link,
              linkLabel: payload.linkLabel,
              timestamp: new Date().toISOString(),
              serviceName: payload.serviceName,
              endpoint: payload.endpoint,
              errorSnippet: payload.errorSnippet,
              duration: payload.duration,
              uptimeWindow: payload.uptimeWindow,
            },
          },
        }).catch((err) => console.error('admin email failed', to, err))
      ),
    );
  } catch (e) {
    console.error('emailAdmins error', e);
  }
}

// Only email admins once per service per hour, even if it keeps flapping.
async function emailAdminsThrottled(
  supabase: ReturnType<typeof createClient>,
  serviceKey: string,
  excludeIncidentId: string,
  payload: Parameters<typeof emailAdmins>[1],
) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("uptime_incidents")
    .select("id")
    .eq("service_key", serviceKey)
    .eq("alerted", true)
    .gte("opened_at", since)
    .neq("id", excludeIncidentId)
    .limit(1)
    .maybeSingle();
  if (recent) {
    console.log(`email throttled for ${serviceKey} (already alerted within the hour)`);
    return;
  }
  await emailAdmins(supabase, payload);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Load alert settings
  const { data: alertSettings } = await supabase
    .from("alert_settings")
    .select("webhook_urls, down_payload_template, up_payload_template")
    .eq("id", 1)
    .maybeSingle();

  const webhookUrls = (alertSettings?.webhook_urls ?? []) as string[];
  const envUrls = (Deno.env.get("ALERT_WEBHOOK_URL") || "")
    .split(/[\s,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
  const allUrls = [...new Set([...webhookUrls, ...envUrls])];

  let mcHost = "warden.rip";
  try {
    const { data } = await supabase.from("site_content").select("value").eq("key", "server").maybeSingle();
    const v = data?.value as { ip?: string } | null;
    if (v?.ip) mcHost = v.ip;
  } catch {
    /* ignore */
  }

  let websiteWebhookUrl: string | null = null;
  try {
    const { data } = await supabase.from("site_content").select("value").eq("key", "status_page").maybeSingle();
    const v = data?.value as { website_webhook_url?: string } | null;
    if (v?.website_webhook_url && /^https?:\/\//i.test(v.website_webhook_url)) {
      websiteWebhookUrl = v.website_webhook_url;
    }
  } catch {
    /* ignore */
  }

  const siteUrl = "https://warden.rip";
  const apiHealth = `${SUPABASE_URL}/rest/v1/`;
  SERVICE_ENDPOINTS.website = siteUrl;
  SERVICE_ENDPOINTS.minecraft = mcHost;
  SERVICE_ENDPOINTS.api = apiHealth;

  const checks = await Promise.all([
    // Do NOT follow redirects on the website check — the lovable.app edge sometimes
    // 3xx-redirects to the custom domain (warden.rip) whose cert can flap while
    // being reissued, producing false-positive incidents.
    checkHttp("website", siteUrl, true, {}, false),
    checkMinecraft("minecraft", mcHost),
    checkHttp("api", apiHealth, false),
    checkHttp("panel", "https://dash.nightly.host"),
    checkHttp("discord", "https://discord.gg/V8xYY2DasZ"),
    checkHttp("portfolio", "https://portfolio.warden.rip"),
  ]);


  const { error: insertErr } = await supabase.from("uptime_checks").insert(checks);
  if (insertErr) {
    return new Response(JSON.stringify({ ok: false, error: insertErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Compute uptime window (last 24h) for each service
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentChecks } = await supabase
    .from("uptime_checks")
    .select("service_key, is_up")
    .gte("checked_at", since24h);

  const uptimeByService = new Map<string, { total: number; up: number }>();
  for (const c of recentChecks ?? []) {
    const s = uptimeByService.get(c.service_key) ?? { total: 0, up: 0 };
    s.total++;
    if (c.is_up) s.up++;
    uptimeByService.set(c.service_key, s);
  }

  // Alerting: open/close incidents
  const alerts: { service: string; kind: "down" | "up" }[] = [];
  for (const c of checks) {
    const name = SERVICE_NAMES[c.service_key] || c.service_key;
    const { data: openIncident } = await supabase
      .from("uptime_incidents")
      .select("id, alerted, opened_at")
      .eq("service_key", c.service_key)
      .is("closed_at", null)
      .maybeSingle();

    const uptimeRec = uptimeByService.get(c.service_key);
    const uptimePct =
      uptimeRec && uptimeRec.total > 0 ? `${((100 * uptimeRec.up) / uptimeRec.total).toFixed(2)}%` : "N/A";

    if (!c.is_up) {
      // Check last 2 checks for this service to require 2+ consecutive failures
      const { data: recent } = await supabase
        .from("uptime_checks")
        .select("is_up")
        .eq("service_key", c.service_key)
        .order("checked_at", { ascending: false })
        .limit(2);
      const twoDown = (recent?.length ?? 0) >= 2 && recent!.every((r) => !r.is_up);

      if (!openIncident && twoDown) {
        const { data: inc } = await supabase
          .from("uptime_incidents")
          .insert({ service_key: c.service_key, last_error: c.error })
          .select("id, opened_at")
          .single();
        if (inc) {
          const duration = formatDuration(0);
          const vars: Record<string, string> = {
            service_name: name,
            service_key: c.service_key,
            status: "DOWN",
            uptime_window: uptimePct,
            incident_duration: duration,
            error: c.error || "Unknown error",
            timestamp: new Date().toISOString(),
          };
          const fallback = {
            username: "Uptime Monitor",
            embeds: [
              {
                title: `🔴 ${name} is DOWN`,
                description: `Service has failed multiple consecutive checks.\n**Uptime (24h):** ${uptimePct}\n**Error:** ${c.error || "Unknown error"}`,
                color: 0xef4444,
                timestamp: new Date().toISOString(),
              },
            ],
          };
          const results = await sendWebhook(
            c.service_key === "website" && websiteWebhookUrl ? [...new Set([...allUrls, websiteWebhookUrl])] : allUrls,
            alertSettings?.down_payload_template,
            vars,
            fallback,
          );
          if (c.service_key === "website" && websiteWebhookUrl)
            await logWebsiteDelivery(supabase, "down", websiteWebhookUrl, results);
          await supabase.from("uptime_incidents").update({ alerted: true }).eq("id", inc.id);
          await emailAdminsThrottled(supabase, c.service_key, inc.id, {
            title: `${name} is DOWN`,
            severity: 'critical',
            summary: `${name} has failed multiple consecutive checks.`,
            details: `Service: ${name}\nEndpoint: ${SERVICE_ENDPOINTS[c.service_key] || 'n/a'}\nUptime (24h): ${uptimePct}\nError: ${c.error || 'Unknown error'}`,
            link: STATUS_URL,
            linkLabel: 'View Status',
            idempotencyKey: `uptime-down-${inc.id}`,
            serviceName: name,
            endpoint: SERVICE_ENDPOINTS[c.service_key] || c.service_key,
            errorSnippet: (c.error || 'Unknown error').slice(0, 500),
            duration: formatDuration(0),
            uptimeWindow: uptimePct,
          });
          alerts.push({ service: c.service_key, kind: "down" });
        }
      } else if (openIncident && !openIncident.alerted) {
        const durMin = (Date.now() - new Date(openIncident.opened_at).getTime()) / 60000;
        const duration = formatDuration(durMin);
        const vars: Record<string, string> = {
          service_name: name,
          service_key: c.service_key,
          status: "DOWN",
          uptime_window: uptimePct,
          incident_duration: duration,
          error: c.error || "Unknown error",
          timestamp: new Date().toISOString(),
        };
        const fallback = {
          username: "Uptime Monitor",
          embeds: [
            {
              title: `🔴 ${name} is DOWN`,
              description: `Service has failed multiple consecutive checks.\n**Uptime (24h):** ${uptimePct}\n**Incident duration:** ${duration}\n**Error:** ${c.error || "Unknown error"}`,
              color: 0xef4444,
              timestamp: new Date().toISOString(),
            },
          ],
        };
        const results = await sendWebhook(
          c.service_key === "website" && websiteWebhookUrl ? [...new Set([...allUrls, websiteWebhookUrl])] : allUrls,
          alertSettings?.down_payload_template,
          vars,
          fallback,
        );
        if (c.service_key === "website" && websiteWebhookUrl)
          await logWebsiteDelivery(supabase, "down", websiteWebhookUrl, results);
        await supabase
          .from("uptime_incidents")
          .update({ alerted: true, last_error: c.error })
          .eq("id", openIncident.id);
        await emailAdminsThrottled(supabase, c.service_key, openIncident.id, {
          title: `${name} still DOWN`,
          severity: 'critical',
          summary: `${name} is still failing after ${duration}.`,
          details: `Service: ${name}\nEndpoint: ${SERVICE_ENDPOINTS[c.service_key] || 'n/a'}\nUptime (24h): ${uptimePct}\nIncident duration: ${duration}\nError: ${c.error || 'Unknown error'}`,
          link: STATUS_URL,
          linkLabel: 'View Status',
          idempotencyKey: `uptime-down-${openIncident.id}-rep`,
          serviceName: name,
          endpoint: SERVICE_ENDPOINTS[c.service_key] || c.service_key,
          errorSnippet: (c.error || 'Unknown error').slice(0, 500),
          duration,
          uptimeWindow: uptimePct,
        });
        alerts.push({ service: c.service_key, kind: "down" });
      }
    } else if (openIncident) {
      await supabase.from("uptime_incidents").update({ closed_at: new Date().toISOString() }).eq("id", openIncident.id);
      if (openIncident.alerted) {
        const durMin = (Date.now() - new Date(openIncident.opened_at).getTime()) / 60000;
        const duration = formatDuration(durMin);
        const vars: Record<string, string> = {
          service_name: name,
          service_key: c.service_key,
          status: "UP",
          uptime_window: uptimePct,
          incident_duration: duration,
          error: "",
          timestamp: new Date().toISOString(),
        };
        const fallback = {
          username: "Uptime Monitor",
          embeds: [
            {
              title: `🟢 ${name} recovered`,
              description: `Service is responding successfully again.\n**Uptime (24h):** ${uptimePct}\n**Incident lasted:** ${duration}`,
              color: 0x22c55e,
              timestamp: new Date().toISOString(),
            },
          ],
        };
        const results = await sendWebhook(
          c.service_key === "website" && websiteWebhookUrl ? [...new Set([...allUrls, websiteWebhookUrl])] : allUrls,
          alertSettings?.up_payload_template,
          vars,
          fallback,
        );
        if (c.service_key === "website" && websiteWebhookUrl)
          await logWebsiteDelivery(supabase, "up", websiteWebhookUrl, results);
        await emailAdmins(supabase, {
          title: `${name} recovered`,
          severity: 'success',
          summary: `${name} is responding successfully again.`,
          details: `Service: ${name}\nEndpoint: ${SERVICE_ENDPOINTS[c.service_key] || 'n/a'}\nUptime (24h): ${uptimePct}\nIncident lasted: ${duration}`,
          link: STATUS_URL,
          linkLabel: 'View Status',
          idempotencyKey: `uptime-up-${openIncident.id}`,
          serviceName: name,
          endpoint: SERVICE_ENDPOINTS[c.service_key] || c.service_key,
          duration,
          uptimeWindow: uptimePct,
        });
        alerts.push({ service: c.service_key, kind: "up" });
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, checks, alerts }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
