import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://xylomc.net",
  "https://www.xylomc.net",
  "https://warden.rip",
  "https://www.warden.rip",
  "https://alsnetwork.fun",
  "https://www.alsnetwork.fun",
  "https://xylomc.lovable.app",
  "https://wardennetwork.lovable.app",
  "https://carnagemc.net",
  "https://id-preview--c9d110ee-1d92-4be5-b8fd-699d505d0940.lovable.app",
]);

function safeReturnTo(input: string | null): string {
  const fallback = "https://xylomc.net/profile";
  if (!input) return fallback;
  try {
    const u = new URL(input);
    const ok = ALLOWED_ORIGINS.has(u.origin);
    return ok ? u.toString() : fallback;
  } catch {
    return fallback;
  }
}

function redirect(returnTo: string | null, status: string, msg?: string) {
  const base = safeReturnTo(returnTo);
  const url = new URL(base);
  url.searchParams.set("discord", status);
  if (msg) url.searchParams.set("msg", msg);
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  let returnTo: string | null = null;
  let stateToken = stateParam;
  if (stateParam?.includes(".")) {
    const [s, rt] = stateParam.split(".");
    stateToken = s;
    try { returnTo = atob(rt); } catch { /* ignore */ }
  }

  if (error || !code || !stateToken) {
    return redirect(returnTo, "error", error || "missing_code");
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: stateRow, error: stateErr } = await admin
      .from("discord_link_states").select("user_id, expires_at")
      .eq("state", stateToken).maybeSingle();
    if (stateErr || !stateRow) return redirect(returnTo, "error", "invalid_state");
    if (new Date(stateRow.expires_at).getTime() < Date.now()) {
      await admin.from("discord_link_states").delete().eq("state", stateToken);
      return redirect(returnTo, "error", "expired_state");
    }
    await admin.from("discord_link_states").delete().eq("state", stateToken);

    const clientId = Deno.env.get("DISCORD_APPLICATION_ID")!;
    const clientSecret = Deno.env.get("DISCORD_CLIENT_SECRET")!;
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/discord-link-callback`;

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) return redirect(returnTo, "error", "token_exchange_failed");
    const tok = await tokenRes.json();

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    if (!userRes.ok) return redirect(returnTo, "error", "fetch_user_failed");
    const du = await userRes.json();

    const { error: updErr } = await admin.from("profiles_private").upsert({
      user_id: stateRow.user_id,
      discord_id: du.id,
      discord_username: du.global_name || du.username,
      discord_avatar: du.avatar
        ? `https://cdn.discordapp.com/avatars/${du.id}/${du.avatar}.png`
        : null,
    }, { onConflict: "user_id" });

    if (updErr) {
      const msg = updErr.message.includes("duplicate") ? "already_linked" : "update_failed";
      return redirect(returnTo, "error", msg);
    }

    return redirect(returnTo, "linked", du.global_name || du.username);
  } catch (e) {
    return redirect(returnTo, "error", "server_error");
  }
});
