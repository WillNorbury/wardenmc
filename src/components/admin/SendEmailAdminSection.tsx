import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, Send, ShieldAlert, History, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { buildGmailDraftUrl } from "@/lib/gmail-draft";
import {
  AllowedFromAddressesAdminSection,
  formatFromAddress,
  type AllowedFromRow,
} from "./AllowedFromAddressesAdminSection";

type AuditRow = {
  id: string;
  sender_email: string | null;
  category: string;
  from_address: string | null;
  subject: string;
  total_recipients: number;
  queued_count: number;
  failed_count: number;
  test_email: string | null;
  created_at: string;
};

type Category = "all" | "admins" | "owners" | "test";

export const SendEmailAdminSection = ({ isOwner }: { isOwner: boolean }) => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [from, setFrom] = useState<string>("");
  const [fromOptions, setFromOptions] = useState<{ label: string; value: string }[]>([]);
  const [testEmail, setTestEmail] = useState("");
  const [bcc, setBcc] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadFromOptions = useCallback(async () => {
    const { data } = await supabase
      .from("allowed_from_addresses" as any)
      .select("email,display_name,active")
      .eq("active", true)
      .order("created_at", { ascending: true });
    const opts = ((data as any as AllowedFromRow[]) ?? []).map((r) => ({
      label: r.email,
      value: formatFromAddress(r.email, r.display_name),
    }));
    setFromOptions(opts);
    setFrom((curr) => {
      if (curr && opts.some((o) => o.value === curr)) return curr;
      return opts[0]?.value ?? "";
    });
  }, []);

  useEffect(() => { loadFromOptions(); }, [loadFromOptions]);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    const { data, error } = await supabase
      .from("admin_broadcast_logs")
      .select("id,sender_email,category,from_address,subject,total_recipients,queued_count,failed_count,test_email,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    setLoadingLogs(false);
    if (!error && data) setLogs(data as AuditRow[]);
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const ownerOnlyCat = category === "owners" || category === "admins";

  const send = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Subject and message are required");
      return;
    }
    if (category === "test" && !testEmail.trim()) {
      toast.error("Enter a test recipient email");
      return;
    }
    if (ownerOnlyCat && !isOwner) {
      toast.error("Only owners can send to this category");
      return;
    }

    const bccList = bcc
      .split(/[,\s;]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const badBcc = bccList.find((e) => !emailRe.test(e));
    if (badBcc) {
      toast.error(`Invalid BCC address: ${badBcc}`);
      return;
    }

    if (category === "all") {
      const draft = window.open("about:blank", "_blank");
      if (!draft) {
        toast.error("Allow pop-ups for this website to open Gmail");
        return;
      }
      draft.opener = null;
      setSending(true);
      setResult(null);
      try {
        const { data, error } = await supabase.functions.invoke("admin-send-broadcast", {
          body: { mode: "gmail-draft", category: "all", subject: subject.trim(), message: message.trim(), from, bcc: bccList },
        });
        if (error) {
          const details = error.context instanceof Response ? await error.context.json().catch(() => null) : null;
          throw new Error(details?.error ?? error.message);
        }
        if (!data?.ok || !Array.isArray(data.recipients)) throw new Error(data?.error ?? "Could not prepare recipients");
        draft.location.replace(buildGmailDraftUrl(subject, message, data.recipients));
        setResult({ ok: true, msg: `Gmail draft opened for ${data.total} recipients. Nothing has been sent.` });
      } catch (error) {
        draft.close();
        const msg = error instanceof Error ? error.message : "Could not open Gmail";
        setResult({ ok: false, msg });
        toast.error(msg);
      } finally {
        setSending(false);
      }
      return;
    }

    setSending(true);
    setResult(null);
    const { data, error } = await supabase.functions.invoke("admin-send-broadcast", {
      body: {
        subject: subject.trim(),
        message: message.trim(),
        category,
        from,
        bcc: bccList,
        testEmail: category === "test" ? testEmail.trim() : undefined,
      },
    });
    setSending(false);

    if (error || !data?.ok) {
      const msg = (data as any)?.error || error?.message || "Failed to send";
      setResult({ ok: false, msg });
      toast.error(
        category === "test" ? `Failed to send to ${testEmail}` : "Failed to send email",
        { description: msg }
      );
      return;
    }
    const queuedN = Number(data.queued ?? 0);
    const totalN = Number(data.total ?? 0);
    if (category === "test") {
      if (queuedN > 0) {
        const msg = `Email sent to ${testEmail}`;
        setResult({ ok: true, msg });
        toast.success(msg, { description: `Subject: ${subject.trim()}` });
      } else {
        const msg = `${testEmail} is suppressed or could not be queued`;
        setResult({ ok: false, msg });
        toast.error("Email not sent", { description: msg });
      }
    } else {
      const ok = `Queued ${queuedN}/${totalN} (${data.category})`;
      setResult({ ok: true, msg: ok });
      toast.success(ok);
    }
    loadLogs();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <AllowedFromAddressesAdminSection onChanged={loadFromOptions} />
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Send Email</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {category === "all" ? "All Users · Gmail" : "Website email"}
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="admins" disabled={!isOwner}>
                  Admins {!isOwner && "(Owner only)"}
                </SelectItem>
                <SelectItem value="owners" disabled={!isOwner}>
                  Owner Only {!isOwner && "(Owner only)"}
                </SelectItem>
                <SelectItem value="test">Single recipient</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>From</Label>
            <Select value={from} onValueChange={setFrom} disabled={category === "all"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {fromOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {category === "all" && <p className="text-xs text-muted-foreground">Your signed-in Gmail account</p>}
          </div>
        </div>

        {category === "test" && (
          <div className="space-y-2">
            <Label>Recipient email</Label>
            <Input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="person@example.com" />
            <p className="text-xs text-muted-foreground">Sends a normal email to this one address — not flagged as a test.</p>
          </div>
        )}

        <div className="space-y-2">
          <Label>BCC (optional)</Label>
          <Input
            value={bcc}
            onChange={(e) => setBcc(e.target.value)}
            placeholder="me@example.com, archive@example.com"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated. Each address receives its own hidden copy — other recipients never see them.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} placeholder="Email subject" />
        </div>

        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={10}
            maxLength={10000}
            placeholder="Write your message here. Line breaks are preserved."
          />
          <p className="text-xs text-muted-foreground">{message.length}/10000 characters</p>
        </div>

        {ownerOnlyCat && !isOwner && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Owner only</AlertTitle>
            <AlertDescription>This category can only be sent by the project owner.</AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert variant={result.ok ? "default" : "destructive"}>
            <AlertTitle>{result.ok ? (category === "all" ? "Draft ready" : "Sent") : "Error"}</AlertTitle>
            <AlertDescription>{result.msg}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end">
          <Button onClick={send} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            {category === "all" ? "Send to all" : "Send Email"}
          </Button>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Broadcast Audit Log</h2>
          </div>
          <Button variant="outline" size="sm" onClick={loadLogs} disabled={loadingLogs}>
            {loadingLogs ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Records every broadcast sent through this panel: sender, time, category, and recipient count. Latest 50 entries.
        </p>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No broadcasts logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground border-b">
                <tr>
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Sender</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Subject</th>
                  <th className="py-2 pr-3 text-right">Recipients</th>
                  <th className="py-2 pr-3 text-right">Queued</th>
                  <th className="py-2 pr-3 text-right">Failed</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3">{l.sender_email ?? "—"}</td>
                    <td className="py-2 pr-3"><Badge variant="secondary">{l.category}</Badge></td>
                    <td className="py-2 pr-3 max-w-xs truncate" title={l.subject}>
                      {l.subject}
                      {l.test_email && <span className="ml-1 text-xs text-muted-foreground">→ {l.test_email}</span>}
                    </td>
                    <td className="py-2 pr-3 text-right">{l.total_recipients}</td>
                    <td className="py-2 pr-3 text-right text-emerald-600">{l.queued_count}</td>
                    <td className="py-2 pr-3 text-right text-destructive">{l.failed_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SendEmailAdminSection;
