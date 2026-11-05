import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { hasSeenIntro, withIntroSeen } from "@/lib/intro";
import brandIcon from "@/assets/warden-network-icon.png";

const INTRO_SRC = "/wardenmc-intro.mp4";
const INTRO_POSTER = "/wardenmc-intro-poster.jpg";
// The intro is a site tour, so it never covers the sign-in screens or the Admin console.
const HIDDEN_PREFIXES = ["/auth", "/reset-password", "/admin"];

export const IntroVideoGate = () => {
  const { session, loading } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const savedPrefs = useRef<Record<string, unknown>>({});
  const checkedFor = useRef<string | null>(null);
  const saving = useRef(false);

  const uid = session?.user?.id ?? null;
  const hidden = HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (loading || !uid || hidden || checkedFor.current === uid) return;
    checkedFor.current = uid;
    let active = true;
    supabase.rpc("get_my_private_profile").then(({ data, error }) => {
      if (!active || error) return;
      const row = Array.isArray(data) ? data[0] : null;
      const prefs = (row?.preferences ?? {}) as Record<string, unknown>;
      savedPrefs.current = prefs;
      if (!hasSeenIntro(prefs)) setOpen(true);
    });
    return () => {
      active = false;
    };
  }, [loading, uid, hidden]);

  async function dismiss() {
    setOpen(false);
    if (saving.current) return;
    saving.current = true;
    // Fail open: if the save fails, the intro simply shows again next visit.
    await supabase.rpc("set_my_preferences", { _prefs: withIntroSeen(savedPrefs.current) });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) void dismiss(); }}>
      <DialogContent
        className="intro-dialog w-[min(92vw,56rem)] max-w-none gap-0 overflow-hidden rounded-2xl border border-border/70 bg-background/95 p-0 shadow-[0_0_80px_-24px_hsl(var(--primary)/0.45)] backdrop-blur-sm"
      >
        <div className="relative aspect-video bg-muted">
          <video
            src={INTRO_SRC}
            poster={INTRO_POSTER}
            autoPlay
            muted
            playsInline
            aria-label="WardenMC welcome tour"
            className="h-full w-full object-contain"
            onLoadedMetadata={(e) => setProgress(0)}
            onTimeUpdate={(e) => {
              const { currentTime, duration } = e.currentTarget;
              setProgress(Number.isFinite(duration) && duration > 0 ? (currentTime / duration) * 100 : 0);
            }}
            onEnded={() => void dismiss()}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-border/40"
          >
            <div
              className="h-full bg-primary transition-[width] duration-200 ease-linear"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <img
              src={brandIcon}
              alt=""
              aria-hidden="true"
              className="mt-0.5 h-9 w-9 shrink-0 object-contain drop-shadow-[0_0_10px_hsl(var(--primary)/0.5)]"
            />
            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold leading-tight">
                Welcome to WardenMC
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                A Minecraft community, guarded. Here is a quick look around.
              </DialogDescription>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => void dismiss()}>
              Skip intro
            </Button>
            <Button size="sm" onClick={() => void dismiss()}>
              Get started
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IntroVideoGate;
