import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twitch";
const DEFAULT_LOGIN = "will_norbury";
const ALLOWED_LOGINS = new Set(["will_norbury", "voxelisadev"]);

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function twitchGet(path: string, params: Record<string, string>) {
  const url = new URL(`${GATEWAY_URL}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      "X-Connection-Api-Key": Deno.env.get("TWITCH_API_KEY") ?? "",
    },
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`Twitch ${path} failed [${res.status}]: ${body}`);
    const err = new Error(`Twitch API ${path} ${res.status}`);
    (err as any).status = res.status;
    (err as any).upstream = true;
    throw err;
  }
  return JSON.parse(body);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!Deno.env.get("LOVABLE_API_KEY") || !Deno.env.get("TWITCH_API_KEY")) {
      return json({ error: "Twitch connector not configured" }, 500);
    }

    const url = new URL(req.url);
    const rawLogin = (url.searchParams.get("login") ?? DEFAULT_LOGIN).trim().toLowerCase();
    if (!/^[a-z0-9_]{2,32}$/.test(rawLogin)) {
      return json({ error: "invalid login" }, 400);
    }
    if (!ALLOWED_LOGINS.has(rawLogin)) {
      return json({ error: "channel not allowed" }, 403);
    }
    const mode = url.searchParams.get("mode") ?? "status";

    if (mode === "clips") {
      const usersRes = await twitchGet("/users", { login: rawLogin });
      const user = usersRes?.data?.[0];
      if (!user) return json({ clips: [], login: rawLogin }, 200);
      const limit = Math.min(20, Math.max(1, parseInt(url.searchParams.get("limit") ?? "8", 10) || 8));
      try {
        const clipsRes = await twitchGet("/clips", {
          broadcaster_id: user.id,
          first: String(limit),
        });
        return json({
          login: user.login,
          displayName: user.display_name,
          clips: (clipsRes?.data ?? []).map((c: any) => ({
            id: c.id,
            title: c.title,
            url: c.url,
            embedUrl: c.embed_url,
            thumbnailUrl: c.thumbnail_url,
            viewCount: c.view_count,
            createdAt: c.created_at,
            duration: c.duration,
            creatorName: c.creator_name,
          })),
        });
      } catch (err) {
        if ((err as any)?.upstream) {
          return json({ login: rawLogin, clips: [], fallback: true, error: "TWITCH_SERVICE_UNAVAILABLE" }, 200);
        }
        throw err;
      }
    }

    const [usersRes, streamsRes] = await Promise.all([
      twitchGet("/users", { login: rawLogin }),
      twitchGet("/streams", { user_login: rawLogin }),
    ]);

    const user = usersRes?.data?.[0];
    const stream = streamsRes?.data?.[0];
    if (!user) {
      return json({ isLive: false, login: rawLogin, error: "channel not found" }, 404);
    }


    let gameName: string | null = stream?.game_name ?? null;
    if (stream?.game_id && !gameName) {
      try {
        const g = await twitchGet("/games", { id: stream.game_id });
        gameName = g?.data?.[0]?.name ?? null;
      } catch { /* ignore */ }
    }

    return json({
      isLive: !!stream,
      login: user.login,
      displayName: user.display_name,
      profileImage: user.profile_image_url,
      description: user.description ?? "",
      title: stream?.title ?? null,
      gameName,
      viewerCount: stream?.viewer_count ?? 0,
      startedAt: stream?.started_at ?? null,
      thumbnailUrl: stream?.thumbnail_url ?? null,
      language: stream?.language ?? null,
    });
  } catch (e) {
    const status = (e as any)?.status;
    const upstream = (e as any)?.upstream;
    // Upstream Twitch/gateway errors → return 200 with fallback so the widget stays graceful
    if (upstream) {
      const url = new URL(req.url);
      const login = (url.searchParams.get("login") ?? DEFAULT_LOGIN).trim().toLowerCase();
      return json({
        isLive: false,
        login,
        displayName: login,
        error: "TWITCH_SERVICE_UNAVAILABLE",
        upstreamStatus: status ?? 0,
        fallback: true,
      }, 200);
    }
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
