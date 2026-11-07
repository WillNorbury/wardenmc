import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { authorizeAppUserOAuth, exchangeAppUserOAuthCode, callAsAppUser, disconnectAppUser, appUserReconnectRequired } from "../_shared/appUserConnector.ts";
import { connectionAdmin, saveConnectionKeyForUser, getConnectionKeyForUser } from "../_shared/appUserConnections.ts";
import { TWITCH_SCOPES } from "../_shared/appUserScopes.ts";
import { isAllowedOrigin, twitchProjection } from "./model.ts";
const GATEWAY = "https://connector-gateway.lovable.dev";
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const profileAdmin = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
async function saveLinkedLogin(userId: string, connectionAPIKey: string) {
  try {
    const res = await callAsAppUser({ gatewayBaseUrl: GATEWAY, connectorId: "twitch", connectionAPIKey, path: "/users", requiredScopes: TWITCH_SCOPES });
    if (!res.ok) return;
    const profile = (await res.json()).data?.[0];
    const login = String(profile?.login ?? "").toLowerCase();
    if (!/^[a-z0-9_]{2,32}$/.test(login)) return;
    const { error } = await profileAdmin().from("profiles").update({ twitch_login: login }).eq("id", userId);
    if (error) console.error("saveLinkedLogin failed:", error.message);
  } catch (e) { console.error("saveLinkedLogin failed:", e instanceof Error ? e.message : String(e)); }
}
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL"); const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const authorization = req.headers.get("Authorization");
    if (!url || !anon || !authorization) return reply({ error: "Sign in required" }, 401);
    const client = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (!user || authError) return reply({ error: "Sign in required" }, 401);
    const body = await req.json();
    if (body.action === "start") {
      if (!isAllowedOrigin(body.origin)) return reply({ error: "Invalid return address" }, 400);
      const clientAPIKey = Deno.env.get("TWITCH_APP_USER_CONNECTOR_CLIENT_API_KEY");
      if (!clientAPIKey) return reply({ error: "Twitch linking needs to be configured" }, 503);
      const result = await authorizeAppUserOAuth({ gatewayBaseUrl: GATEWAY, connectorId: "twitch", appUserId: user.id, clientAPIKey, returnUrl: new URL("/oauth/twitch/return", body.origin).toString(), credentialsConfiguration: { scopes: TWITCH_SCOPES } });
      return reply({ authorizationUrl: result.authorizationUrl });
    }
    if (body.action === "complete") {
      if (typeof body.code !== "string" || !body.code || body.code.length > 4096) return reply({ error: "Invalid connection code" }, 400);
      const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(GATEWAY, body.code);
      if (connectorId !== "twitch") return reply({ error: "Wrong account provider" }, 400);
      await saveConnectionKeyForUser(user.id, connectorId, connectionAPIKey);
      await saveLinkedLogin(user.id, connectionAPIKey);
      return reply({ ok: true });
    }
    if (body.action !== "profile" && body.action !== "disconnect") return reply({ error: "Invalid action" }, 400);
    const key = await getConnectionKeyForUser(user.id, "twitch");
    if (!key) return reply({ connected: false });
    if (body.action === "disconnect") {
      await disconnectAppUser({ gatewayBaseUrl: GATEWAY, connectorId: "twitch", connectionAPIKey: key });
      const { error } = await connectionAdmin().from("app_user_connections").delete().eq("user_id", user.id).eq("connector_id", "twitch");
      if (error) throw error;
      await profileAdmin().from("profiles").update({ twitch_login: null }).eq("id", user.id);
      return reply({ connected: false });
    }
    const res = await callAsAppUser({ gatewayBaseUrl: GATEWAY, connectorId: "twitch", connectionAPIKey: key, path: "/users", requiredScopes: TWITCH_SCOPES });
    if (await appUserReconnectRequired(res)) return reply({ connected: false, reconnectRequired: true });
    if (!res.ok) { const details = await res.text(); return reply({ error: "Twitch could not load your account", status: res.status, details }, 502); }
    const result = await res.json(); const profile = result.data?.[0];
    if (!profile) return reply({ error: "Twitch returned no account" }, 502);
    return reply({ connected: true, profile: twitchProjection(profile) });
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Twitch linking failed" }, 502);
  }
});
