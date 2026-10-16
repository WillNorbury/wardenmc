import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";

type State = "idle" | "working" | "done" | "error" | "missing";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function StatusUnsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Unsubscribe — Warden Network Status";
  }, []);

  const run = async () => {
    if (!UUID_RE.test(token)) {
      setState("missing");
      return;
    }
    setState("working");
    const { data, error } = await supabase.rpc("status_unsubscribe", { _token: token });
    if (error) {
      setError(error.message);
      setState("error");
      return;
    }
    if (!data) {
      setState("missing");
      return;
    }
    setState("done");
  };

  useEffect(() => {
    if (token) run();
    else setState("missing");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f] text-slate-100">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-[#1a1a24] border border-white/10 p-8">
          <h1 className="font-['Space_Grotesk'] text-3xl font-bold tracking-tight italic mb-1">
            UNSUBSCRIBE
          </h1>
          <p className="text-xs font-mono uppercase tracking-widest text-[#ff5722] mb-6">
            Status incident alerts
          </p>

          {state === "working" && (
            <div className="flex items-center gap-2 text-[#9ca3af] text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Removing your email…
            </div>
          )}

          {state === "done" && (
            <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <div>You've been unsubscribed. You won't receive any more incident emails.</div>
            </div>
          )}

          {state === "missing" && (
            <div className="rounded border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300 flex items-start gap-2">
              <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                This unsubscribe link is invalid or has already been used. If you're still getting
                emails, use the link at the bottom of the most recent email.
              </div>
            </div>
          )}

          {state === "error" && (
            <div className="rounded border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300 flex items-start gap-2">
              <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                Couldn't unsubscribe: {error}
                <button
                  onClick={run}
                  className="ml-2 underline hover:text-white"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          <Link
            to="/status"
            className="mt-6 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#9ca3af] hover:text-[#ff5722] transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to status
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
