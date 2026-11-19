import { useEffect, useMemo, useRef, useState, KeyboardEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Terminal, Trash2, Plus, RefreshCw, Settings, Eye, EyeOff, Copy, Download, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { confirm } from "@/lib/confirm";

type Server = {
  id: string; name: string; slug: string; description: string | null;
  enabled: boolean; last_seen_at: string | null;
};

type LogRow = {
  id: number; server_id: string; level: string; source: string; line: string; logged_at: string;
};

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const BRIDGE_URL = `https://${PROJECT_ID}.functions.supabase.co/mc-bridge-poll`;

function isOnline(last?: string | null) {
  if (!last) return false;
  return Date.now() - new Date(last).getTime() < 30_000;
}


const LiveConsole = ({ server }: { server: Server }) => {
  const [lines, setLines] = useState<LogRow[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState("");
  
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // Load initial backlog
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("mc_console_logs")
        .select("*")
        .eq("server_id", server.id)
        .order("logged_at", { ascending: false })
        .limit(200);
      if (!cancelled && data) setLines(data.reverse() as LogRow[]);
    })();
    return () => { cancelled = true; };
  }, [server.id]);

  // Realtime subscribe
  useEffect(() => {
    const channel = supabase
      .channel(`mc-logs-${server.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "mc_console_logs", filter: `server_id=eq.${server.id}` },
        (payload) => {
          if (pausedRef.current) return;
          setLines((p) => [...p.slice(-999), payload.new as LogRow]);
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "mc_console_commands", filter: `server_id=eq.${server.id}` },
        (payload) => {
          const row: any = payload.new;
          if (row.status === "done" || row.status === "error") {
            const text = row.response?.trim();
            if (text) {
              setLines((p) => [...p.slice(-999), {
                id: Date.now(), server_id: server.id,
                level: row.status === "error" ? "ERROR" : "INFO",
                source: "command", line: `← ${text}`,
                logged_at: new Date().toISOString(),
              }]);
            }
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [server.id]);

  useEffect(() => {
    if (!paused) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, paused]);

  const send = async () => {
    const cmd = input.trim();
    if (!cmd) return;
    setHistory((h) => [...h, cmd]);
    setHistIdx(null);
    setInput("");
    setBusy(true);
    // Echo
    setLines((p) => [...p, {
      id: Date.now(), server_id: server.id, level: "INFO", source: "command",
      line: `> ${cmd}`, logged_at: new Date().toISOString(),
    }]);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const r = await fetch(`https://${PROJECT_ID}.functions.supabase.co/mc-console-send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sess.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ server_id: server.id, command: cmd }),
      });
      const j = await r.json();
      if (!r.ok) {
        setLines((p) => [...p, {
          id: Date.now(), server_id: server.id, level: "ERROR", source: "command",
          line: `! ${j?.error ?? `HTTP ${r.status}`}`, logged_at: new Date().toISOString(),
        }]);
      }
    } catch (e: any) {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !busy) { e.preventDefault(); send(); }
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!history.length) return;
      const i = histIdx === null ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(i); setInput(history[i]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx === null) return;
      const i = histIdx + 1;
      if (i >= history.length) { setHistIdx(null); setInput(""); }
      else { setHistIdx(i); setInput(history[i]); }
    }
  };

  const visible = useMemo(() => {
    let l = lines;
    if (filter.trim()) {
      const q = filter.toLowerCase();
      l = l.filter((x) => x.line.toLowerCase().includes(q));
    }
    return l;
  }, [lines, filter]);

  const online = isOnline(server.last_seen_at);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2 bg-muted/30">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className={cn("h-2 w-2 rounded-full", online ? "bg-green-500 animate-pulse" : "bg-muted-foreground")} />
          <Terminal className="h-4 w-4" />
          {server.name} <span className="text-muted-foreground">({server.slug})</span>
        </div>
        <div className="flex items-center gap-2">
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="filter…" className="h-8 w-40" />
          <Button variant="ghost" size="sm" onClick={() => setPaused((p) => !p)}>
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setLines([])}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="bg-black text-green-300 font-mono text-xs p-4 h-[60vh] overflow-y-auto whitespace-pre-wrap">
        {visible.length === 0 && (
          <div className="text-muted-foreground italic">
            {online ? "Waiting for log output…" : "Server offline — install the bridge plugin to start streaming."}
          </div>
        )}
        {visible.map((l) => {
          const colorClass =
            l.level === "ERROR" ? "text-red-400"
            : l.level === "WARN" ? "text-yellow-300"
            : l.source === "command" ? (l.line.startsWith(">") ? "text-white" : "text-cyan-300")
            : "text-green-300";
          return (
            <div key={l.id} className={colorClass}>
              <span className="text-muted-foreground/60 mr-2">
                {new Date(l.logged_at).toLocaleTimeString()}
              </span>
              {l.line}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="flex items-center gap-2 border-t p-2 bg-card">
        <span className="font-mono text-sm text-muted-foreground pl-2">{server.slug}$</span>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder={online ? "Type a console command — e.g. `say hello` or `op Player`" : "Server offline"}
          className="font-mono"
          disabled={busy || !online}
          autoFocus
        />
        <Button onClick={send} disabled={busy || !input.trim() || !online}>Run</Button>
      </div>
    </Card>
  );
};

const JAR_PATH = "CarnageConsoleBridge-latest.jar";

const ServerInstallDialog = ({ server, onRotate, isOwner }: { server: Server; onRotate: () => void; isOwner: boolean }) => {
  const [show, setShow] = useState(false);
  const [jarUrl, setJarUrl] = useState<string | null>(null);
  const [jarMeta, setJarMeta] = useState<{ size: number; updated: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [secret, setSecret] = useState<string>("");
  const [secretLoading, setSecretLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const copy = (v: string, label = "Copied") => { navigator.clipboard.writeText(v); toast({ title: label }); };

  const loadSecret = async (): Promise<string> => {
    if (secret) return secret;
    setSecretLoading(true);
    const { data, error } = await (supabase as any).rpc("mc_server_get_ingest_secret", { _server_id: server.id });
    setSecretLoading(false);
    if (error) { toast({ title: "Failed to load secret", description: error.message, variant: "destructive" }); return ""; }
    const value = String(data ?? "");
    setSecret(value);
    return value;
  };

  const configYaml =
`# Drop into plugins/CarnageConsoleBridge/config.yml on your Minecraft server
endpoint: ${BRIDGE_URL}
server-slug: ${server.slug}
server-secret: ${secret || "<click Reveal secret to load>"}
poll-interval-ms: 1000
log-batch-ms: 1000`;


  const loadJar = async () => {
    const { data: list } = await supabase.storage.from("mc-bridge-jars").list("", { limit: 100 });
    const file = list?.find((f) => f.name === JAR_PATH);
    if (!file) { setJarUrl(null); setJarMeta(null); return; }
    const { data: signed } = await supabase.storage.from("mc-bridge-jars").createSignedUrl(JAR_PATH, 3600);
    setJarUrl(signed?.signedUrl ?? null);
    setJarMeta({
      size: (file.metadata as any)?.size ?? 0,
      updated: file.updated_at ?? file.created_at ?? "",
    });
  };
  useEffect(() => { loadJar(); }, []);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".jar")) { toast({ title: "Must be a .jar file", variant: "destructive" }); return; }
    setUploading(true);
    const { error } = await supabase.storage.from("mc-bridge-jars")
      .upload(JAR_PATH, file, { upsert: true, contentType: "application/java-archive" });
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "JAR uploaded", description: `${(file.size / 1024).toFixed(0)} KB` });
    loadJar();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Settings className="h-4 w-4 mr-1" /> Install</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Install bridge for {server.name}</DialogTitle>
          <DialogDescription>
            Three steps: download the JAR, drop it into <code>plugins/</code>, paste the config.yml below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Step 1 — JAR */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">1</span>
              Download the plugin JAR
            </h4>
            {jarUrl ? (
              <div className="flex items-center gap-2 flex-wrap">
                <Button asChild variant="default" size="sm">
                  <a href={jarUrl} download="CarnageConsoleBridge.jar">
                    <Download className="h-4 w-4 mr-1" /> Download JAR
                  </a>
                </Button>
                {jarMeta && (
                  <span className="text-xs text-muted-foreground">
                    {(jarMeta.size / 1024).toFixed(0)} KB · updated {new Date(jarMeta.updated).toLocaleString()}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No JAR uploaded yet.{isOwner ? " Upload one below." : " Ask an owner to upload it."}
              </p>
            )}
            {isOwner && (
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept=".jar" onChange={onUpload} className="hidden" />
                <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" /> {uploading ? "Uploading…" : jarUrl ? "Replace JAR" : "Upload JAR"}
                </Button>
                <span className="text-xs text-muted-foreground">Owner only · max 50&nbsp;MB</span>
              </div>
            )}
          </section>

          {/* Step 2 — drop in plugins */}
          <section className="space-y-1">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">2</span>
              Drop the JAR into your server
            </h4>
            <p className="text-xs text-muted-foreground">
              Stop the server → copy the JAR into <code>plugins/</code> → start the server once so it generates
              <code> plugins/CarnageConsoleBridge/config.yml</code> → stop the server again.
            </p>
          </section>

          {/* Step 3 — config */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">3</span>
              Paste this config.yml, then restart
            </h4>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="w-28 text-xs">Endpoint</Label>
                <Input readOnly value={BRIDGE_URL} className="font-mono text-xs h-8" />
                <Button size="icon" variant="ghost" onClick={() => copy(BRIDGE_URL)}><Copy className="h-4 w-4" /></Button>
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-28 text-xs">Server slug</Label>
                <Input readOnly value={server.slug} className="font-mono text-xs h-8" />
                <Button size="icon" variant="ghost" onClick={() => copy(server.slug)}><Copy className="h-4 w-4" /></Button>
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-28 text-xs">Ingest secret</Label>
                <Input readOnly type={show ? "text" : "password"} value={secret} placeholder={secretLoading ? "Loading…" : "Click Reveal to load"} className="font-mono text-xs h-8" />
                <Button size="icon" variant="ghost" onClick={async () => { await loadSecret(); setShow((s) => !s); }} disabled={secretLoading}>
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={async () => { const v = await loadSecret(); if (v) copy(v, "Secret copied"); }} disabled={secretLoading}><Copy className="h-4 w-4" /></Button>
              </div>

            </div>

            <div className="relative">
              <Textarea readOnly className="font-mono text-xs h-44 pr-12" value={configYaml} />
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={async () => {
                  const v = await loadSecret();
                  const yaml = `# Drop into plugins/CarnageConsoleBridge/config.yml on your Minecraft server
endpoint: ${BRIDGE_URL}
server-slug: ${server.slug}
server-secret: ${v}
poll-interval-ms: 1000
log-batch-ms: 1000`;
                  copy(yaml, "config.yml copied");
                }}
              >
                <Copy className="h-3.5 w-3.5 mr-1" /> Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              After restart, the dot next to this server turns green within ~5 seconds and live logs stream into the Console tab.
            </p>
          </section>

          <div className="flex justify-end border-t pt-3">
            <Button variant="destructive" size="sm" onClick={onRotate}>
              <RefreshCw className="h-4 w-4 mr-1" /> Rotate secret
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ServersTab = ({ servers, reload }: { servers: Server[]; reload: () => void }) => {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const create = async () => {
    if (!name.trim() || !slug.trim()) {
      toast({ title: "Name and slug required", variant: "destructive" }); return;
    }
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) {
      toast({ title: "Not signed in", variant: "destructive" }); return;
    }
    const { error } = await supabase.from("mc_servers").insert({
      name: name.trim(),
      slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      description: description.trim() || null,
      created_by: uid,
    });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setName(""); setSlug(""); setDescription("");
    toast({ title: "Server added" });
    reload();
  };


  const toggle = async (s: Server) => {
    await supabase.from("mc_servers").update({ enabled: !s.enabled }).eq("id", s.id);
    reload();
  };
  const remove = async (s: Server) => {
    if (!(await confirm(`Delete ${s.name}? This removes all its logs and command history.`))) return;
    await supabase.from("mc_servers").delete().eq("id", s.id);
    reload();
  };
  const rotate = async (s: Server) => {
    if (!(await confirm("Rotate the ingest secret? The bridge plugin will need the new value."))) return;
    const { data, error } = await supabase.rpc("mc_server_rotate_secret", { _server_id: s.id });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "New secret generated", description: String(data).slice(0, 12) + "…" });
    reload();
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Add server</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Survival" /></div>
          <div><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="survival" /></div>
          <div><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" /></div>
        </div>
        <Button onClick={create}><Plus className="h-4 w-4 mr-1" /> Add</Button>
      </Card>

      <div className="space-y-2">
        {servers.length === 0 && (
          <p className="text-muted-foreground text-sm">No servers yet — add one above.</p>
        )}
        {servers.map((s) => (
          <Card key={s.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <span className={cn("h-2 w-2 rounded-full", isOnline(s.last_seen_at) ? "bg-green-500" : "bg-muted-foreground")} />
              <div>
                <div className="font-medium">{s.name} <span className="text-muted-foreground text-xs">({s.slug})</span></div>
                {s.description && <div className="text-xs text-muted-foreground">{s.description}</div>}
                <div className="text-[10px] text-muted-foreground">
                  {s.last_seen_at ? `Last seen ${new Date(s.last_seen_at).toLocaleString()}` : "Never seen"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs">
                <Switch checked={s.enabled} onCheckedChange={() => toggle(s)} /> Enabled
              </div>
              <ServerInstallDialog server={s} onRotate={() => rotate(s)} isOwner={true} />
              <Button variant="ghost" size="sm" onClick={() => remove(s)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const ConsoleAdminSection = () => {
  const [servers, setServers] = useState<Server[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const { data } = await supabase
      .from("mc_servers")
      .select("id, name, slug, description, enabled, last_seen_at, created_by, created_at, updated_at")
      .order("created_at", { ascending: true });
    setServers((data as Server[]) ?? []);
    setLoading(false);
    if (data && data.length && !activeId) setActiveId(data[0].id);
  };

  useEffect(() => { reload(); }, []);

  // Poll last_seen_at every 10s for the picker dot
  useEffect(() => {
    const t = setInterval(reload, 10_000);
    return () => clearInterval(t);
  }, []);

  const active = servers.find((s) => s.id === activeId) ?? null;

  return (
    <Tabs defaultValue="console" className="space-y-4">
      <TabsList>
        <TabsTrigger value="console">Console</TabsTrigger>
        <TabsTrigger value="servers">Servers</TabsTrigger>
      </TabsList>

      <TabsContent value="console" className="space-y-4">
        {loading ? <p className="text-muted-foreground">Loading…</p> : servers.length === 0 ? (
          <Card className="p-6 text-center space-y-2">
            <p className="text-muted-foreground">No Minecraft servers configured yet.</p>
            <p className="text-sm">Switch to the <strong>Servers</strong> tab to add one.</p>
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Label className="text-sm">Server</Label>
              <Select value={activeId ?? undefined} onValueChange={setActiveId}>
                <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {servers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", isOnline(s.last_seen_at) ? "bg-green-500" : "bg-muted-foreground")} />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {active && <LiveConsole key={active.id} server={active} />}
          </>
        )}
      </TabsContent>

      <TabsContent value="servers">
        <ServersTab servers={servers} reload={reload} />
      </TabsContent>
    </Tabs>
  );
};

export default ConsoleAdminSection;
