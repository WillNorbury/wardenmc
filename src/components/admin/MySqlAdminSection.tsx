import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Database,
  Play,
  ShieldAlert,
  Loader2,
  Copy,
  History,
  BookOpen,
} from "lucide-react";
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
    title: "Soft-unban a ban by id",
    sql: "UPDATE litebans_bans\nSET active = 0,\n    removed_by_uuid = 'CONSOLE',\n    removed_by_name = 'CONSOLE',\n    removed_by_reason = 'Unbanned via web',\n    removed_by_date = UNIX_TIMESTAMP() * 1000\nWHERE id = <BAN_ID> AND active = 1;",
  },
  {
    title: "Unmute a player",
    sql: "UPDATE litebans_mutes\nSET active = 0,\n    removed_by_uuid = 'CONSOLE',\n    removed_by_name = 'CONSOLE',\n    removed_by_reason = 'Unmuted via web',\n    removed_by_date = UNIX_TIMESTAMP() * 1000\nWHERE uuid = '<UUID>' AND active = 1;",
  },
  {
    title: "Recent 25 punishments",
    sql: "(SELECT 'ban' AS type, id, name, reason, time FROM litebans_bans)\nUNION ALL\n(SELECT 'mute', id, name, reason, time FROM litebans_mutes)\nUNION ALL\n(SELECT 'kick', id, name, reason, time FROM litebans_kicks)\nUNION ALL\n(SELECT 'warn', id, name, reason, time FROM litebans_warnings)\nORDER BY time DESC\nLIMIT 25;",
  },
  { title: "Delete a warning", sql: "DELETE FROM litebans_warnings WHERE id = <WARN_ID>;" },
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

export const MySqlAdminSection = () => {
  const [sql, setSql] = useState<string>("SHOW TABLES LIKE 'litebans_%';");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

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

  const runNow = async () => {
    const query = sql.trim();
    if (!query) return;
    setRunning(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("litebans-mysql-query", {
        body: { sql: query },
      });
      if (error) {
        setResult({ ok: false, error: error.message });
        toast.error("Query failed");
      } else {
        setResult(data as RunResult);
        if ((data as any)?.ok) {
          pushHistory(query);
          toast.success(
            (data as any).kind === "rows"
              ? `${(data as any).rowCount} rows in ${(data as any).durationMs}ms`
              : `${(data as any).affectedRows} affected in ${(data as any).durationMs}ms`,
          );
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
      setConfirmOpen(true);
      return;
    }
    void runNow();
  };

  const verb = useMemo(() => detectVerb(sql), [sql]);

  return (
    <div className="space-y-6">
      <Card className="p-4 border-amber-500/30 bg-amber-500/5">
        <div className="flex gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-medium">You are connected directly to the LiteBans database.</p>
            <p className="text-muted-foreground">
              Writes are irreversible. Prefer soft-unbans (set <code className="bg-muted px-1 rounded">active = 0</code>)
              over <code className="bg-muted px-1 rounded">DELETE</code>. Time columns are epoch milliseconds.
              Owner-only.
            </p>
          </div>
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
              <div className="border rounded-md p-3 text-sm space-y-1">
                <div className="font-semibold">Write OK ({result.durationMs}ms)</div>
                <div>Affected rows: <code>{result.affectedRows}</code></div>
                <div>Changed rows: <code>{result.changedRows}</code></div>
                {result.insertId ? <div>Insert id: <code>{result.insertId}</code></div> : null}
                {result.info && <div className="text-muted-foreground">{result.info}</div>}
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run {verb} against LiteBans?</AlertDialogTitle>
            <AlertDialogDescription>
              This is a write query. It will change or delete data in the live LiteBans database.
              There is no automatic backup or undo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <pre className="text-xs bg-muted/40 rounded p-2 max-h-40 overflow-auto"><code>{sql}</code></pre>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                void runNow();
              }}
            >
              Yes, run it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MySqlAdminSection;
