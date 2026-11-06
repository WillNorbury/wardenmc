import { Link } from "react-router-dom";
import { Activity, Clock3, LogIn, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/warden-network-icon.png";

export function MaintenanceScreen({ title, message }: { title?: string; message?: string }) {
  return (
    <main className="maintenance-page min-h-[100svh] flex items-center justify-center bg-background text-foreground px-5 py-12">
      <section className="maintenance-panel w-full max-w-[536px] border border-border bg-card/95 px-6 py-10 text-center sm:px-10 sm:py-12" aria-labelledby="maintenance-title">
        <div className="mb-8 flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
          <img src={logo} alt="" className="h-7 w-7 object-contain" />
          Warden Network
        </div>
        <div className="maintenance-gears mx-auto mb-8" aria-hidden="true">
          <Settings className="maintenance-gear maintenance-gear-forward text-primary" strokeWidth={2.5} />
          <Settings className="maintenance-gear maintenance-gear-reverse text-muted-foreground" strokeWidth={2.5} />
        </div>
        <h1 id="maintenance-title" className="mb-4 font-sans text-3xl font-bold leading-tight sm:text-[40px]">
          {title || "Site Under Maintenance"}
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground whitespace-pre-wrap break-words sm:text-lg">
          {message || "We're currently updating our website to bring you an even better experience."}
        </p>
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Clock3 className="h-4 w-4 shrink-0 text-primary" />
          <span>Check our status page for updates</span>
        </div>
        <div className="maintenance-progress my-8 h-1.5 overflow-hidden rounded-full bg-muted" role="status" aria-label="Maintenance in progress">
          <div className="maintenance-progress-bar h-full rounded-full bg-primary" />
        </div>
        <nav aria-label="Maintenance links" className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="ghost" className="text-muted-foreground">
            <Link to="/status"><Activity /> Status</Link>
          </Button>
          <Button asChild variant="ghost" className="text-muted-foreground">
            <Link to="/auth"><LogIn /> Sign in</Link>
          </Button>
        </nav>
      </section>
    </main>
  );
}