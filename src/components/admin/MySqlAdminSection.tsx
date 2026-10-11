import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Database,
  Play,
  ShieldAlert,
  Loader2,
  Copy,
  History,
  BookOpen,
  PencilLine,
  Settings2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type RunResult =
  | {
      ok: true;
      kind: "rows";
      rows: Record<string, unknown>[];
      rowCount: number;
      fields: { name: string }[];
      durationMs: number;
    }
  | {
      ok: true;
      kind: "write";
      affectedRows: number;
      changedRows: number;
      insertId: number;
      info: string | null;
      durationMs: number;
    }
  | { ok: false; error: string; code?: string | null; sqlState?: string | null };

const HISTORY_KEY = "litebans_sql_history_v1";
const MAX_HISTORY = 25;

const SNIPPETS: { title: string; sql: string }[] = [
  { title: "List LiteBans tables", sql: "SHOW TABLES LIKE 'litebans_%';" },
  {
    title: "Active bans for player (UUID)",
    sql: "SELECT id, name, reason, banned_by_name, time, until, active\nFROM litebans_bans\nWHERE uuid = '<UUID>' AND active = 1\nORDER BY time DESC;",
  },
  {
    title: "Recent 25 punishments",
    sql: "(SELECT 'ban' AS type, id, name, reason, time FROM litebans_bans)\nUNION ALL\n(SELECT 'mute', id, name, reason, time FROM litebans_mutes)\nUNION ALL\n(SELECT 'kick', id, name, reason, time FROM litebans_kicks)\nUNION ALL\n(SELECT 'warn', id, name, reason, time FROM litebans_warnings)\nORDER BY time DESC\nLIMIT 25;",
  },
];

const WRITE_SNIPPETS: { title: string; sql: string }[] = [
  {
    title: "Lift a ban (set inactive)",
    sql: "UPDATE litebans_bans\nSET active = 0, removed_by_name = 'WardenMC Web', removed_by_reason = 'Lifted via admin panel', removed_by_date = UNIX_TIMESTAMP() * 1000\nWHERE uuid = '<UUID>' AND active = 1;",
  },
  {
    title: "Lift a mute (set inactive)",
    sql: "UPDATE litebans_mutes\nSET active = 0, removed_by_name = 'WardenMC Web', removed_by_reason = 'Lifted via admin panel', removed_by_date = UNIX_TIMESTAMP() * 1000\nWHERE uuid = '<UUID>' AND active = 1;",
  },
  {
    title: "Edit a ban reason",
    sql: "UPDATE litebans_bans\nSET reason = 'New reason here'\nWHERE id = 123;",
  },
];

const isReadOnly = (sql: string) => {
  const s = sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "").trim().toUpperCase();
  return s.startsWith("SELECT") || s.startsWith("SHOW") || s.startsWith("DESCRIBE") || s.startsWith("EXPLAIN");
};

const detectVerb = (sql: string) => {
  const m = sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--.*$/gm, "")
    .trim()
    .toUpperCase()
    .match(/^[A-Z]+/);
  return m?.[0] ?? "SQL";
};

const cellDisplay = (v: unknown) => {
  if (v === null || v === undefined) return <span className="text-muted-foreground italic">NULL</span>;
  if (typeof v === "object") return <code className="text-xs">{JSON.stringify(v)}</code>;
  return String(v);
};

// Write mode is locked to this account only (server enforces the same).
const WRITE_ALLOWED_USER_ID = "a9ff5e2f-cad4-4805-9acd-095065d18179";

export const MySqlAdminSection = () => {
  const { user } = useAuth();
  const canWrite = user?.id === WRITE_ALLOWED_USER_ID;
  const [sql, setSql] = useState<string>("SHOW TABLES LIKE 'litebans_%';");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [writeMode, setWriteMode] = useState(false);
  const [showEnableWrite, setShowEnableWrite] = useState(false);
  const [showConfirmWrite, setShowConfirmWrite] = useState(false);
  const [cfg, setCfg] = useState({ host: "", port: "3306", username: "", password: "", database_name: "" });
  const [cfgLoaded, setCfgLoaded] = useState(false);
  const [cfgSaving, setCfgSaving] = useState(false);
  const [cfgTesting, setCfgTesting] = useState(false);

  const testCfg = async () => {
    setCfgTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("litebans-mysql-query", {
        body: { action: "test_connection", config: cfg },
      });
      if (error) {
        toast.error(`Test failed: ${error.message}`);
      } else if ((data as any)?.ok) {
        toast.success(`Connected to ${(data as any).server} (${(data as any).database}) in ${(data as any).durationMs}ms`);
      } else {
        toast.error(`Test failed: ${(data as any)?.error ?? "unknown error"}`);
      }
    } catch (e: any) {
      toast.error(`Test failed: ${String(e?.message ?? e)}`);
    } finally {
      setCfgTesting(false);
    }
  };

  useEffect(() => {
    if (!canWrite) return;
    supabase
      .from("litebans_mysql_config")
      .select("host, port, username, password, database_name")
      .eq("id", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setCfg({
            host: data.host ?? "",
            port: String(data.port ?? 3306),
            username: data.username ?? "",
            password: data.password ?? "",
            database_name: data.database_name ?? "",
          });
        }
        setCfgLoaded(true);
      });
  }, [canWrite]);

  const saveCfg = async () => {
    setCfgSaving(true);
    const { error } = await supabase.from("litebans_mysql_config").upsert({
      id: true,
      host: cfg.host.trim() || null,
      port: Number(cfg.port) || 3306,
      username: cfg.username.trim() || null,
      password: cfg.password || null,
      database_name: cfg.database_name.trim() || null,
      updated_at: new Date().toISOString(),
    });
    setCfgSaving(false);
    if (error) {
      toast.error("Couldn't save connection settings");
    } else {
      toast.success("Connection settings saved — new queries will use them.");
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);


  const pushHistory = (q: string) => {
    setHistory((prev) => {
      const next = [q, ...prev.filter((p) => p !== q)].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const runNow = async (isWrite: boolean) => {
    const query = sql.trim();
    if (!query) return;
    setRunning(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("litebans-mysql-query", {
        body: { sql: query, write: isWrite, confirm: isWrite },
      });
      if (error) {
        setResult({ ok: false, error: error.message });
        toast.error("Query failed");
      } else {
        setResult(data as RunResult);
        if ((data as any)?.ok) {
          pushHistory(query);
          if ((data as any).kind === "write") {
            toast.success(`Done — ${(data as any).affectedRows} row(s) affected in ${(data as any).durationMs}ms`);
          } else {
            toast.success(`${(data as any).rowCount} rows in ${(data as any).durationMs}ms`);
          }
        } else {
          toast.error("MySQL error");
        }
      }
    } catch (e: any) {
      setResult({ ok: false, error: String(e?.message ?? e) });
      toast.error("Request failed");
    } finally {
      setRunning(false);
    }
  };

  const onRun = () => {
    if (!sql.trim()) return;
    if (!isReadOnly(sql)) {
      if (!writeMode) {
        toast.error("Turn on write mode to run INSERT/UPDATE/DELETE queries.");
        return;
      }
      setShowConfirmWrite(true);
      return;
    }
    void runNow(false);
  };

  const onWriteToggle = (next: boolean) => {
    if (next) {
      setShowEnableWrite(true);
    } else {
      setWriteMode(false);
    }
  };

  const verb = useMemo(() => detectVerb(sql), [sql]);

  return (
    <div className="space-y-6">
      {canWrite && cfgLoaded && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Connection settings</span>
            <span className="text-xs text-muted-foreground">— only you can see or change these</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Host</label>
              <Input value={cfg.host} onChange={(e) => setCfg({ ...cfg, host: e.target.value })} placeholder="e.g. 123.45.67.89" className="font-mono text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Port</label>
              <Input value={cfg.port} onChange={(e) => setCfg({ ...cfg, port: e.target.value })} placeholder="3306" className="font-mono text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Username</label>
              <Input value={cfg.username} onChange={(e) => setCfg({ ...cfg, username: e.target.value })} className="font-mono text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Password</label>
              <Input type="password" value={cfg.password} onChange={(e) => setCfg({ ...cfg, password: e.target.value })} className="font-mono text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Database</label>
              <Input value={cfg.database_name} onChange={(e) => setCfg({ ...cfg, database_name: e.target.value })} placeholder="litebans" className="font-mono text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" onClick={testCfg} disabled={cfgTesting || cfgSaving}>
              {cfgTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Test connection
            </Button>
            <Button onClick={saveCfg} disabled={cfgSaving || cfgTesting}>
              {cfgSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save connection
            </Button>
          </div>
        </Card>
      )}
      <Card className={writeMode ? "p-4 border-destructive/40 bg-destructive/5" : "p-4 border-amber-500/30 bg-amber-500/5"}>
        <div className="flex gap-3">
          <ShieldAlert className={`h-5 w-5 shrink-0 mt-0.5 ${writeMode ? "text-destructive" : "text-amber-500"}`} />
          <div className="text-sm space-y-1 flex-1">
            <p className="font-medium">
              {writeMode
                ? "Write mode is ON — queries can change or remove punishments."
                : "You are connected directly to the LiteBans database (read-only)."}
            </p>
            <p className="text-muted-foreground">
              {writeMode
                ? "INSERT, UPDATE, DELETE and REPLACE are allowed on litebans_ tables only. UPDATE/DELETE need a WHERE clause. Every write asks for confirmation first."
                : "This console can only look up data. Turn on write mode below to edit punishment rows, or use the in-game commands (/unban, /unmute). Time columns are epoch milliseconds. Owner-only."}
            </p>
          </div>
          {canWrite && (
            <div className="flex items-center gap-2 shrink-0">
              <PencilLine className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium">Write mode</span>
              <Switch checked={writeMode} onCheckedChange={onWriteToggle} />
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-4 w-4 text-primary" />
          <h2 className="font-bold">Connection</h2>
          <Badge variant="outline" className="ml-1 text-xs">MySQL</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          The LiteBans connection is managed through protected backend secrets and is never stored in
          the website database or shown in the browser.
        </p>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Database className="h-4 w-4 text-primary" />
          <h2 className="font-bold">SQL editor</h2>
          <Badge variant="outline" className="ml-1 text-xs">LiteBans</Badge>
          <Badge
            variant={isReadOnly(sql) ? "secondary" : "destructive"}
            className="text-[10px] uppercase"
          >
            {verb}
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(sql);
                toast.success("Copied");
              }}
            >
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy
            </Button>
            <Button size="sm" onClick={onRun} disabled={running || !sql.trim()}>
              {running ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 mr-1" />
              )}
              Run
            </Button>
          </div>
        </div>
        <Textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          spellCheck={false}
          className="font-mono text-sm min-h-[180px] leading-relaxed"
          placeholder="SELECT * FROM litebans_bans LIMIT 10;"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              onRun();
            }
          }}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Tip: <kbd className="border rounded px-1">⌘/Ctrl</kbd> + <kbd className="border rounded px-1">Enter</kbd> to run.
        </p>
      </Card>

      <Card className="p-4">
        <Tabs defaultValue="results">
          <TabsList>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="snippets"><BookOpen className="h-3.5 w-3.5 mr-1" />Snippets</TabsTrigger>
            <TabsTrigger value="history"><History className="h-3.5 w-3.5 mr-1" />History</TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="mt-4">
            {!result && (
              <p className="text-sm text-muted-foreground">Run a query to see results here.</p>
            )}
            {result && result.ok === false && (() => {
              const err = result as Extract<RunResult, { ok: false }>;
              return (
                <div className="border border-destructive/40 bg-destructive/5 rounded-md p-3 text-sm">
                  <div className="font-semibold text-destructive mb-1">MySQL error</div>
                  <div className="font-mono text-xs whitespace-pre-wrap">{err.error}</div>
                  {(err.code || err.sqlState) && (
                    <div className="text-xs text-muted-foreground mt-2">
                      {err.code && <>code: <code>{err.code}</code> </>}
                      {err.sqlState && <>sqlState: <code>{err.sqlState}</code></>}
                    </div>
                  )}
                </div>
              );
            })()}
            {result?.ok && result.kind === "write" && (
              <div className="border border-primary/40 bg-primary/5 rounded-md p-3 text-sm space-y-1">
                <div className="font-semibold">Write query completed</div>
                <div className="text-xs text-muted-foreground">
                  {result.affectedRows} row(s) affected · {result.changedRows} changed
                  {result.insertId ? <> · new id {result.insertId}</> : null} · {result.durationMs}ms
                </div>
                {result.info && <div className="font-mono text-xs">{result.info}</div>}
              </div>
            )}
            {result?.ok && result.kind === "rows" && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  {result.rowCount} rows · {result.durationMs}ms
                </div>
                {result.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rows.</p>
                ) : (
                  <ScrollArea className="max-h-[520px] w-full rounded border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(result.rows[0]).map((k) => (
                            <TableHead key={k} className="whitespace-nowrap font-mono text-xs">
                              {k}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.rows.slice(0, 500).map((row, i) => (
                          <TableRow key={i}>
                            {Object.keys(result.rows[0]).map((k) => (
                              <TableCell key={k} className="font-mono text-xs align-top max-w-[420px] truncate">
                                {cellDisplay(row[k])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
                {result.rows.length > 500 && (
                  <p className="text-xs text-muted-foreground">
                    Showing first 500 of {result.rows.length}.
                  </p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="snippets" className="mt-4 space-y-2">
            {SNIPPETS.map((s) => (
              <div key={s.title} className="border rounded-md p-2 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{s.title}</div>
                  <pre className="text-xs bg-muted/40 rounded p-2 mt-1 overflow-x-auto"><code>{s.sql}</code></pre>
                </div>
                <Button size="sm" variant="outline" onClick={() => setSql(s.sql)}>Load</Button>
              </div>
            ))}
            {writeMode && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-destructive pt-2">Write snippets</p>
                {WRITE_SNIPPETS.map((s) => (
                  <div key={s.title} className="border border-destructive/30 rounded-md p-2 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{s.title}</div>
                      <pre className="text-xs bg-muted/40 rounded p-2 mt-1 overflow-x-auto"><code>{s.sql}</code></pre>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setSql(s.sql)}>Load</Button>
                  </div>
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-2">
            {history.length === 0 && <p className="text-sm text-muted-foreground">No history yet.</p>}
            {history.map((q, i) => (
              <div key={i} className="border rounded-md p-2 flex items-start gap-3">
                <pre className="text-xs bg-muted/40 rounded p-2 flex-1 overflow-x-auto"><code>{q}</code></pre>
                <Button size="sm" variant="outline" onClick={() => setSql(q)}>Load</Button>
              </div>
            ))}
            {history.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setHistory([]);
                  localStorage.removeItem(HISTORY_KEY);
                }}
              >
                Clear history
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </Card>

      <AlertDialog open={showEnableWrite} onOpenChange={setShowEnableWrite}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn on write mode?</AlertDialogTitle>
            <AlertDialogDescription>
              Write mode lets you run INSERT, UPDATE, DELETE and REPLACE statements directly against the live
              LiteBans database. Mistakes can change or remove real punishment records and cannot be undone
              from here. In-game commands remain the safer option for routine changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep read-only</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setWriteMode(true);
                toast.success("Write mode on — every write still asks for confirmation.");
              }}
            >
              Turn on write mode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showConfirmWrite} onOpenChange={setShowConfirmWrite}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run this write query?</AlertDialogTitle>
            <AlertDialogDescription>
              This will change the live LiteBans database immediately. Review the statement before confirming.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <pre className="text-xs bg-muted/40 rounded p-3 overflow-x-auto max-h-64"><code>{sql}</code></pre>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirmWrite(false);
                void runNow(true);
              }}
            >
              Run write query
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default MySqlAdminSection;
