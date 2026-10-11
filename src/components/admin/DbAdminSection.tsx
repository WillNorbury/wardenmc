import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Database, Play, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

// This console is locked to a single account; the database function enforces it too.
const ALLOWED_USER_ID = "a9ff5e2f-cad4-4805-9acd-095065d18179";

type RunResult =
  | { ok: true; kind: "rows"; rows: Record<string, unknown>[]; durationMs: number }
  | { ok: true; kind: "write"; affectedRows: number; durationMs: number }
  | { ok: false; error: string };

const isReadQuery = (sql: string) =>
  /^\s*(select|with|show|explain|table|values)\b/i.test(sql.trim());

const cellDisplay = (v: unknown) => {
  if (v === null || v === undefined) return <span className="text-muted-foreground italic">NULL</span>;
  if (typeof v === "object") return <code className="text-xs">{JSON.stringify(v)}</code>;
  return String(v);
};

export const DbAdminSection = () => {
  const { user } = useAuth();
  const allowed = user?.id === ALLOWED_USER_ID;
  const [sql, setSql] = useState<string>("SELECT * FROM public.profiles LIMIT 25;");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [showConfirmWrite, setShowConfirmWrite] = useState(false);

  const readOnly = useMemo(() => isReadQuery(sql), [sql]);

  const runNow = async () => {
    setRunning(true);
    setResult(null);
    const started = Date.now();
    try {
      const { data, error } = await supabase.rpc("admin_run_sql", { _sql: sql });
      if (error) {
        setResult({ ok: false, error: error.message });
        toast.error(error.message);
        return;
      }
      const payload = data as { kind: string; rows?: Record<string, unknown>[]; affectedRows?: number };
      const durationMs = Date.now() - started;
      if (payload?.kind === "rows") {
        setResult({ ok: true, kind: "rows", rows: payload.rows ?? [], durationMs });
      } else {
        setResult({ ok: true, kind: "write", affectedRows: payload?.affectedRows ?? 0, durationMs });
        toast.success(`Done — ${payload?.affectedRows ?? 0} row(s) affected in ${durationMs}ms`);
      }
    } catch (e: any) {
      setResult({ ok: false, error: e?.message ?? "Query failed" });
    } finally {
      setRunning(false);
    }
  };

  const onRun = () => {
    if (!sql.trim()) return;
    if (readOnly) {
      void runNow();
    } else {
      setShowConfirmWrite(true);
    }
  };

  if (!allowed) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        This console is locked to the site owner account.
      </Card>
    );
  }

  const rows = result?.ok && result.kind === "rows" ? result.rows : [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-6">
      <Card className="p-4 border-destructive/40 bg-destructive/5">
        <div className="flex gap-3">
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-destructive" />
          <div className="text-sm space-y-1">
            <p className="font-medium">Full access to the website database — locked to your account.</p>
            <p className="text-muted-foreground">
              SELECT queries run straight away. Anything that changes data (INSERT, UPDATE, DELETE, DDL)
              asks for confirmation first. There is no undo — double-check statements before running them.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">SQL</span>
        </div>
        <Textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          rows={6}
          className="font-mono text-sm"
          spellCheck={false}
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-muted-foreground">
            {readOnly ? "Read query — runs immediately." : "Write query — will ask for confirmation."}
          </span>
          <Button onClick={onRun} disabled={running || !sql.trim()}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Run
          </Button>
        </div>
      </Card>

      {result?.ok === false && (
        <Card className="p-4 border-destructive/40">
          <p className="text-sm text-destructive font-mono whitespace-pre-wrap">{result.error}</p>
        </Card>
      )}

      {result?.ok && result.kind === "write" && (
        <Card className="p-4">
          <p className="text-sm">
            Done — <span className="font-medium">{result.affectedRows}</span> row(s) affected in {result.durationMs}ms.
          </p>
        </Card>
      )}

      {result?.ok && result.kind === "rows" && (
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-2">
            {rows.length} row(s) in {result.durationMs}ms
          </p>
          <ScrollArea className="max-h-[480px]">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => (
                    <TableHead key={c} className="font-mono text-xs">{c}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    {columns.map((c) => (
                      <TableCell key={c} className="text-xs">{cellDisplay(r[c])}</TableCell>
                    ))}
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell className="text-sm text-muted-foreground">No rows.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      <AlertDialog open={showConfirmWrite} onOpenChange={setShowConfirmWrite}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run this write query?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>This will change the website database. There is no undo.</p>
                <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap font-mono">{sql}</pre>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirmWrite(false);
                void runNow();
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
