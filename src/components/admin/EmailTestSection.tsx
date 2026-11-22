import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Mail, KeyRound, RefreshCw, Loader2 } from "lucide-react";

type LogRow = {
  message_id: string;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
};

const TEMPLATES = ["signup", "recovery", "magiclink"] as const;

const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  if (status === "sent") return "default";
  if (status === "failed" || status === "dlq" || status === "bounced") return "destructive";
  if (status === "suppressed" || status === "complained") return "secondary";
  return "outline";
};

export const EmailTestSection = () => {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"signup" | "recovery" | null>(null);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const [lastTriggered, setLastTriggered] = useState<string | null>(null);

  const loadLatest = async (filterEmail?: string) => {
    setLoadingLog(true);
    let q = supabase
      .from("email_send_log")
      .select("message_id, template_name, recipient_email, status, error_message, created_at")
      .in("template_name", TEMPLATES as unknown as string[])
      .order("created_at", { ascending: false })
      .limit(50);
    if (filterEmail) q = q.eq("recipient_email", filterEmail.toLowerCase());
    const { data, error } = await q;
    if (error) {
      toast({ title: "Failed to load email log", description: error.message, variant: "destructive" });
    } else {
      // Dedupe by message_id (keep latest = first by created_at desc)
      const seen = new Set<string>();
      const deduped: LogRow[] = [];
      for (const r of (data ?? []) as LogRow[]) {
        if (seen.has(r.message_id)) continue;
        seen.add(r.message_id);
        deduped.push(r);
      }
      setRows(deduped.slice(0, 10));
    }
    setLoadingLog(false);
  };

  useEffect(() => {
    loadLatest();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const trigger = async (type: "signup" | "recovery") => {
    if (!email.trim()) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }
    setBusy(type);
    setLastTriggered(new Date().toISOString());
    try {
      const { data, error } = await supabase.functions.invoke("admin-test-auth-email", {
        body: { type, email: email.trim() },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error + ((data as any).hint ? ` — ${(data as any).hint}` : ""));
      toast({
        title: `Test ${type === "signup" ? "signup" : "password reset"} email triggered`,
        description: `Sent to ${email}. Watch the result panel for delivery status.`,
      });
      // Poll a few times
      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        await loadLatest(email.trim());
      }
    } catch (e: any) {
      toast({ title: "Trigger failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Test auth emails
          </CardTitle>
          <CardDescription>
            Your account email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-md">
            <Label htmlFor="test-email">Recipient email</Label>
            <Input
              id="test-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              readOnly
              autoComplete="off"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => trigger("signup")} disabled={busy !== null || !email}>
              {busy === "signup" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
              Send signup test
            </Button>
            <Button onClick={() => trigger("recovery")} disabled={busy !== null || !email} variant="secondary">
              {busy === "recovery" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
              Send password reset test
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle>Latest results</CardTitle>
            <CardDescription>
              Most recent signup &amp; recovery emails from the send log (deduped by message).
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadLatest()} disabled={loadingLog}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingLog ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No signup or recovery emails logged yet.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div
                  key={r.message_id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs uppercase">
                        {r.template_name}
                      </Badge>
                      <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                    </div>
                    <span className="truncate text-muted-foreground">{r.recipient_email}</span>
                    {r.error_message && (
                      <span className="text-destructive text-xs break-all">{r.error_message}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
          {lastTriggered && (
            <p className="mt-3 text-xs text-muted-foreground">
              Last triggered at {new Date(lastTriggered).toLocaleTimeString()}.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailTestSection;
