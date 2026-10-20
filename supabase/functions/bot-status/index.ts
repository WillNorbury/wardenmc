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

// A future persistent gateway client may supply heartbeats; REST refreshes are not presence.
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

    const [presenceRes, serverRes, incidentsRes] = await Promise.all([
      admin.from("site_content").select("value").eq("key", "wardenbot_presence").maybeSingle(),
      admin.from("site_content").select("value").eq("key", "server").maybeSingle(),
      admin.rpc("get_public_active_uptime_incidents", { _limit: 10 }),
    ]);

    if (incidentsRes.error) {
      console.error("Active incident lookup failed:", incidentsRes.error.message);
      return json({ ok: false, error: "Ongoing issues could not be checked. Please try again." }, 503);
    }

    const serverValue = (serverRes.data?.value ?? null) as { ip?: string } | null;
    const mcAddress = typeof serverValue?.ip === "string" && serverValue.ip ? serverValue.ip : DEFAULT_MC_ADDRESS;
    const minecraft = await fetchMinecraft(mcAddress);

    const presence = (presenceRes.data?.value ?? null) as { at?: string; text?: string; connectionMode?: string } | null;
    const lastSeenAt = typeof presence?.at === "string" ? presence.at : null;
    const lastSeenMs = lastSeenAt ? Date.parse(lastSeenAt) : NaN;
    const botOnline = presence?.connectionMode !== "rest_only" && Number.isFinite(lastSeenMs) && Date.now() - lastSeenMs >= 0 && Date.now() - lastSeenMs < ONLINE_GRACE_MS;

    return json({
      ok: true,
      bot: {
        online: botOnline,
        statusText: typeof presence?.text === "string" ? presence.text : null,
        lastSeenAt,
      },
      minecraft: { ...minecraft, address: mcAddress },
      incidents: incidentsRes.data ?? [],
      checkedAt: new Date().toISOString(),
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
