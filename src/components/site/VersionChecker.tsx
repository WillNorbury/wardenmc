import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const POLL_MS = 60_000;

/**
 * Polls /version.json (stamped at build time) and shows a "new version"
 * banner when the deployed build differs from the one this tab loaded.
 */
export default function VersionChecker() {
  const [outdated, setOutdated] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let initial: string | null = null;
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string };
        if (!data.version) return;
        if (initial === null) {
          initial = data.version;
        } else if (data.version !== initial && !cancelled) {
          setOutdated(true);
        }
      } catch {
        /* ignore network hiccups */
      }
    };

    void check();
    const timer = setInterval(check, POLL_MS);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (!outdated || dismissed) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-full border border-primary/40 bg-background/95 px-4 py-2 shadow-lg backdrop-blur"
    >
      <span className="text-sm">New version is available, refresh your page.</span>
      <Button size="sm" className="gap-1.5" onClick={() => window.location.reload()}>
        <RefreshCw className="h-3.5 w-3.5" />
        Refresh
      </Button>
      <button
        type="button"
        aria-label="Dismiss"
        className="text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
