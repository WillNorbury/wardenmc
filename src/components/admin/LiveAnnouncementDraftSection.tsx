import { useEffect, useRef, useState } from "react";
import { Copy, Download, Mail, Radio, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { buildAnnouncementHtml, buildAnnouncementText, DEFAULT_LIVE_ANNOUNCEMENT, draftStorageKey, LIVE_ANNOUNCEMENT_FROM, liveAnnouncementSchema, readAnnouncementDraft, type LiveAnnouncementDraft } from "@/lib/live-announcement";

export function LiveAnnouncementDraftSection() {
  const { user } = useAuth();
  const [draft, setDraft] = useState<LiveAnnouncementDraft>({ ...DEFAULT_LIVE_ANNOUNCEMENT });
  const [saved, setSaved] = useState(false);
  const preview = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const cta = useRef<HTMLAnchorElement>(null);
  const muted = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!user) return;
    try { setDraft(readAnnouncementDraft(localStorage.getItem(draftStorageKey(user.id)))); }
    catch { toast.error("Saved draft could not be loaded."); }
    setSaved(false);
  }, [user?.id]);

  const update = (key: keyof LiveAnnouncementDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };
  const checked = liveAnnouncementSchema.safeParse(draft);
  const html = () => {
    if (!preview.current || !panel.current || !cta.current || !muted.current) throw new Error("Preview is not ready.");
    const outer = getComputedStyle(preview.current);
    const inner = getComputedStyle(panel.current);
    const button = getComputedStyle(cta.current);
    return buildAnnouncementHtml(draft, {
      background: outer.backgroundColor, panel: inner.backgroundColor, text: inner.color,
      muted: getComputedStyle(muted.current).color, primary: button.backgroundColor,
      onPrimary: button.color, border: inner.borderTopColor,
    });
  };
  const copy = async (kind: "subject" | "text" | "html") => {
    try {
      await navigator.clipboard.writeText(kind === "subject" ? draft.subject : kind === "text" ? buildAnnouncementText(draft) : html());
      toast.success(kind === "subject" ? "Subject copied" : kind === "text" ? "Email text copied" : "Email HTML copied");
    } catch { toast.error("Could not copy the draft. Check your browser clipboard permission."); }
  };
  const save = () => {
    if (!user || !checked.success) return;
    try {
      localStorage.setItem(draftStorageKey(user.id), JSON.stringify(checked.data));
      setSaved(true);
      toast.success("Draft saved in this browser");
    } catch { toast.error("Could not save this draft in your browser."); }
  };
  const download = () => {
    try {
      const url = URL.createObjectURL(new Blob([html()], { type: "text/html;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url; link.download = "warden-live-announcement.html"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Email draft downloaded");
    } catch { toast.error("Could not download the draft."); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3"><Mail className="h-5 w-5 text-primary" /><Badge variant="secondary">Draft only · not sent</Badge></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { setDraft({ ...DEFAULT_LIVE_ANNOUNCEMENT }); setSaved(false); }}><RotateCcw className="mr-2 h-4 w-4" />Reset</Button>
          <Button onClick={save} disabled={!checked.success || !user}><Save className="mr-2 h-4 w-4" />{saved ? "Saved in this browser" : "Save draft"}</Button>
        </div>
      </div>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <div className="space-y-2"><Label htmlFor="live-from">Intended sender</Label><Input id="live-from" readOnly value={`Will Norbury <${LIVE_ANNOUNCEMENT_FROM}>`} /></div>
          <div className="space-y-2"><Label htmlFor="live-subject">Subject</Label><Input id="live-subject" value={draft.subject} maxLength={200} onChange={(e) => update("subject", e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="live-heading">Headline</Label><Input id="live-heading" value={draft.heading} maxLength={160} onChange={(e) => update("heading", e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="live-title">Stream title (optional)</Label><Input id="live-title" value={draft.streamTitle} maxLength={200} onChange={(e) => update("streamTitle", e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="live-message">Message</Label><Textarea id="live-message" rows={9} value={draft.message} maxLength={4000} onChange={(e) => update("message", e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="live-url">Stream link</Label><Input id="live-url" type="url" value={draft.streamUrl} onChange={(e) => update("streamUrl", e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="live-button">Button label</Label><Input id="live-button" value={draft.buttonLabel} maxLength={60} onChange={(e) => update("buttonLabel", e.target.value)} /></div>
          {!checked.success && <p role="alert" className="text-sm text-destructive">Complete the subject, headline, message and button label, and enter a valid HTTPS stream link.</p>}
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button variant="outline" disabled={!checked.success} onClick={() => copy("subject")}><Copy className="mr-2 h-4 w-4" />Copy subject</Button>
            <Button variant="outline" disabled={!checked.success} onClick={() => copy("text")}><Copy className="mr-2 h-4 w-4" />Copy email text</Button>
            <Button variant="outline" disabled={!checked.success} onClick={() => copy("html")}><Copy className="mr-2 h-4 w-4" />Copy HTML</Button>
            <Button variant="outline" disabled={!checked.success} onClick={download}><Download className="mr-2 h-4 w-4" />Download HTML</Button>
          </div>
        </div>
        <div className="min-w-0 space-y-3">
          <h2 className="font-display text-2xl">Email preview</h2>
          <div className="break-words border-b border-border pb-3 text-sm"><p className="text-muted-foreground">From: Will Norbury &lt;{LIVE_ANNOUNCEMENT_FROM}&gt;</p><p className="mt-1 font-semibold">{draft.subject}</p></div>
          <section ref={preview} aria-label="Live announcement preview" className="bg-background p-3 sm:p-6">
            <div ref={panel} className="min-w-0 rounded-md border border-border bg-card p-5 text-card-foreground sm:p-8">
              <div className="flex items-center gap-2 text-xs font-bold text-primary"><Radio className="h-4 w-4" />WARDEN NETWORK · LIVE</div>
              <h3 className="my-6 break-words font-display text-4xl">{draft.heading}</h3>
              {draft.streamTitle && <p className="mb-4 break-words text-lg font-semibold">{draft.streamTitle}</p>}
              <p className="whitespace-pre-wrap break-words leading-7">{draft.message}</p>
              <Button asChild className="my-8 max-w-full h-auto whitespace-normal break-words"><a ref={cta} href={checked.success ? checked.data.streamUrl : undefined} target="_blank" rel="noopener noreferrer">{draft.buttonLabel || "Watch live"}</a></Button>
              <p ref={muted} className="border-t border-border pt-4 text-xs text-muted-foreground">Warden Network · warden.rip</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}