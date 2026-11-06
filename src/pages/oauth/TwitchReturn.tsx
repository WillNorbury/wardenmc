import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { twitchAccountRequest } from "@/lib/twitch-account";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
export default function TwitchReturn() {
  const { user, loading } = useAuth();
  const started = useRef(false);
  const [message, setMessage] = useState("Finishing Twitch connection…");
  useEffect(() => {
    if (loading || started.current) return;
    if (!user) { setMessage("Sign in to your Warden account, then link Twitch again from your profile."); return; }
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const notify = (ok: boolean, reason?: string) => {
      window.opener?.postMessage({ type: ok ? "appUserConnectorOAuthComplete" : "appUserConnectorOAuthFailed", connectorId: "twitch", reason }, window.location.origin);
      if (ok && window.opener) window.close();
    };
    const code = params.get("code");
    window.history.replaceState({}, "", window.location.pathname);
    if (params.get("success") !== "true" || !code) {
      const reason = params.get("offline_access_allowed") === "false" ? "A workspace admin needs to enable offline access for Twitch linking." : "Twitch linking was cancelled or did not complete. Try again from your profile.";
      setMessage(reason); notify(false, reason); return;
    }
    void twitchAccountRequest({ action: "complete", code }).then(() => { setMessage("Twitch account linked"); notify(true); }).catch(error => { const reason = error instanceof Error ? error.message : "Could not finish Twitch linking."; setMessage(reason); notify(false, reason); });
  }, [loading, user]);
  return <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center"><h1 className="text-2xl font-semibold">Twitch account</h1><p role="status" className="max-w-lg break-words text-muted-foreground">{message}</p><Button asChild variant="outline"><Link to="/profile">Back to profile</Link></Button></main>;
}
