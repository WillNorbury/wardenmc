function requireApiKey(): string {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY is not set");
  return key;
}
export interface AppUserOAuthAuthorizeParams { gatewayBaseUrl: string; connectorId: string; appUserId: string; clientAPIKey: string; returnUrl: string; credentialsConfiguration?: Record<string, unknown> }
export interface AppUserOAuthAuthorizeResponse { authorizationUrl: string; sessionId: string }
export async function authorizeAppUserOAuth(params: AppUserOAuthAuthorizeParams): Promise<AppUserOAuthAuthorizeResponse> {
  const res = await fetch(`${params.gatewayBaseUrl}/api/v1/app-users/oauth2/authorize`, { method: "POST", headers: { Authorization: `Bearer ${requireApiKey()}`, "Content-Type": "application/json", "X-Client-Api-Key": params.clientAPIKey }, body: JSON.stringify({ connector_id: params.connectorId, app_user_id: params.appUserId, return_url: params.returnUrl, credentials_configuration: params.credentialsConfiguration }) });
  const text = await res.text();
  if (!res.ok) throw new Error(`App User OAuth start failed (${res.status}): ${text}`);
  const body = JSON.parse(text);
  if (!body.authorization_url) throw new Error("Missing authorization URL");
  return { authorizationUrl: body.authorization_url, sessionId: body.session_id ?? "" };
}
export interface CallAsAppUserParams { gatewayBaseUrl: string; connectionAPIKey: string; connectorId: string; path: string; init?: RequestInit; requiredScopes?: string[] }
export async function callAsAppUser({ gatewayBaseUrl, connectionAPIKey, connectorId, path, init, requiredScopes }: CallAsAppUserParams): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${requireApiKey()}`);
  headers.set("X-Connection-Api-Key", connectionAPIKey);
  if (requiredScopes?.length) headers.set("X-Lovable-Required-Scopes", requiredScopes.join(" "));
  return fetch(`${gatewayBaseUrl}/${connectorId}${path.startsWith("/") ? path : `/${path}`}`, { ...init, headers });
}
export async function appUserReconnectRequired(res: Response): Promise<boolean> {
  if (res.status !== 401) return false;
  const body = await res.clone().json().catch(() => null);
  return typeof body?.type === "string" && body.type.startsWith("credential_");
}
export interface DisconnectAppUserParams { gatewayBaseUrl: string; connectionAPIKey: string; connectorId: string }
export async function disconnectAppUser({ gatewayBaseUrl, connectionAPIKey, connectorId }: DisconnectAppUserParams): Promise<void> {
  const res = await fetch(`${gatewayBaseUrl}/api/v1/app-users/connection`, { method: "DELETE", headers: { Authorization: `Bearer ${requireApiKey()}`, "X-Connection-Api-Key": connectionAPIKey, "Content-Type": "application/json" }, body: JSON.stringify({ connector_id: connectorId }) });
  if (!res.ok) throw new Error(`App User disconnect failed (${res.status}): ${await res.text()}`);
}
export interface ExchangeAppUserOAuthCodeResult { connectionAPIKey: string; connectorId: string }
export async function exchangeAppUserOAuthCode(gatewayBaseUrl: string, code: string): Promise<ExchangeAppUserOAuthCodeResult> {
  const res = await fetch(`${gatewayBaseUrl}/api/v1/app-users/oauth2/exchange`, { method: "POST", headers: { Authorization: `Bearer ${requireApiKey()}`, "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
  const text = await res.text();
  if (!res.ok) throw new Error(`App User OAuth exchange failed (${res.status}): ${text}`);
  const body = JSON.parse(text);
  if (!body.api_key || !body.connector_id) throw new Error("Missing connection result");
  return { connectionAPIKey: body.api_key, connectorId: body.connector_id };
}
