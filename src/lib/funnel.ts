import { supabase } from "@/integrations/supabase/client";

export type FunnelEvent = "signup_view" | "signup_complete";

const SESSION_KEY = "wn_funnel_session";

function sessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

/** Fire-and-forget funnel tracking; never blocks UI. */
export function trackFunnelEvent(event: FunnelEvent) {
  supabase
    .from("funnel_events")
    .insert({ event, session_id: sessionId() })
    .then(({ error }) => {
      if (error) console.warn("funnel track failed:", error.message);
    });
}
