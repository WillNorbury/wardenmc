import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// The presence keepalive runs every minute; allow a small grace window.
const ONLINE_GRACE_MS = 3 * 60 * 1000;
const DEFAULT_MC_ADDRESS = "warden.rip";

type MinecraftStatus = {
  online: boolean;
  playersOnline: number | null;
  playersMax: number | null;
  version: string | null;
  motd: string | null;
};

async function fetchMinecraft(address: string): Promise<MinecraftStatus> {
  try {
    const res = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(address)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`mcsrvstat ${res.status}`);
    const d = await res.json();
    const motdRaw = d?.motd?.clean;
    return {
      online: !!d?.online,
      playersOnline: typeof d?.players?.online === "number" ? d.players.online : null,
      playersMax: typeof d?.players?.max === "number" ? d.players.max : null,
      version: typeof d?.version === "string" ? d.version : null,
      motd: Array.isArray(motdRaw) ? motdRaw.join(" ") : null,
    };
  } catch {
    return { online: false, playersOnline: null, playersMax: null, version: null, motd: null };
  }
}

// Public: WardenBot presence, Minecraft server players and open incidents.
// No auth — everything returned here is public status info.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [presenceRes, incidentsRes, minecraft] = await Promise.all([
      admin.from("site_content").select("value").eq("key", "wardenbot_presence").maybeSingle(),
      admin
        .from("status_incidents")
        .select("id, incident_number, service_key, opened_at, last_error")
        .is("closed_at", null)
        .order("opened_at", { ascending: false })
        .limit(10),
      fetchMinecraft(),
    ]);

    const presence = (presenceRes.data?.value ?? null) as { at?: string; text?: string } | null;
    const lastSeenAt = typeof presence?.at === "string" ? presence.at : null;
    const lastSeenMs = lastSeenAt ? Date.parse(lastSeenAt) : NaN;
    const botOnline = Number.isFinite(lastSeenMs) && Date.now() - lastSeenMs < ONLINE_GRACE_MS;

    return json({
      ok: true,
      bot: {
        online: botOnline,
        statusText: typeof presence?.text === "string" ? presence.text : null,
        lastSeenAt,
      },
      minecraft,
      incidents: incidentsRes.data ?? [],
      checkedAt: new Date().toISOString(),
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
