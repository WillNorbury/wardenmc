import { createClient } from "npm:@supabase/supabase-js@2";
import { encryptConnectionKey, decryptConnectionKey } from "./connectionKeyCrypto.ts";
export function connectionAdmin() {
  const url = Deno.env.get("SUPABASE_URL"); const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Account storage is not configured");
  return createClient(url, key);
}
export async function saveConnectionKeyForUser(userId: string, connectorId: string, connectionAPIKey: string) {
  const { error } = await connectionAdmin().from("app_user_connections").upsert({ user_id: userId, connector_id: connectorId, connection_key_ciphertext: await encryptConnectionKey(connectionAPIKey), updated_at: new Date().toISOString() }, { onConflict: "user_id,connector_id" });
  if (error) throw error;
}
export async function getConnectionKeyForUser(userId: string, connectorId: string) {
  const { data, error } = await connectionAdmin().from("app_user_connections").select("connection_key_ciphertext").eq("user_id", userId).eq("connector_id", connectorId).maybeSingle();
  if (error) throw error;
  return data ? await decryptConnectionKey(data.connection_key_ciphertext) : null;
}
