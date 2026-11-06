import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
export type TwitchAccount = { connected: boolean; reconnectRequired?: boolean; profile?: { login: string; displayName: string; avatarUrl: string } };
export async function twitchAccountRequest<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("twitch-account", { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const text = await error.context.text();
      let message = text;
      try { message = JSON.parse(text).error ?? text; } catch { /* Plain-text errors are preserved. */ }
      throw new Error(message);
    }
    throw error;
  }
  return data as T;
}
export function waitForTwitch(popup: Window): Promise<void> {
  return new Promise((resolve, reject) => {
    let poll: number | undefined;
    const cleanup = () => { window.removeEventListener("message", onMessage); if (poll !== undefined) window.clearInterval(poll); };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== popup || event.data?.connectorId !== "twitch") return;
      if (event.data.type !== "appUserConnectorOAuthComplete" && event.data.type !== "appUserConnectorOAuthFailed") return;
      cleanup();
      if (event.data.type === "appUserConnectorOAuthComplete") resolve();
      else { popup.close(); reject(new Error(event.data.reason ?? "Twitch linking did not complete.")); }
    };
    window.addEventListener("message", onMessage);
    poll = window.setInterval(() => { if (popup.closed) { cleanup(); reject(new Error("Twitch window closed before linking completed.")); } }, 500);
  });
}
