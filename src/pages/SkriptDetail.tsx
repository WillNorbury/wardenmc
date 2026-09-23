import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import PageLoader from "@/components/site/PageLoader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  Download,
  FileCode,
  Link as LinkIcon,
  MoreVertical,
  Package,
  User,
} from "lucide-react";

type Skript = {
  id: string;
  name: string;
  description: string | null;
  filename: string;
  storage_path: string;
  size_bytes: number | null;
  version: string | null;
  tags: string[];
  downloads: number;
  uploaded_by: string;
  icon_url: string | null;
  created_at: string;
  updated_at: string | null;
  published: boolean;
};

type Uploader = { display_name: string | null; mc_username: string | null };

const fmtBytes = (n: number | null) => {
  if (!n) return "—";
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

const timeAgo = (iso: string | null) => {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)} minutes ago`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)} hours ago`;
  const d = h / 24;
  if (d < 7) return `${Math.floor(d)} days ago`;
  const w = d / 7;
  if (w < 5) return `${Math.floor(w)} weeks ago`;
  const mo = d / 30;
  if (mo < 12) return `${Math.floor(mo)} months ago`;
  return `${Math.floor(d / 365)} years ago`;
};

const SkriptDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [sk, setSk] = useState<Skript | null>(null);
  const [uploader, setUploader] = useState<Uploader | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [downloadCount, setDownloadCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("user_skripts" as any)
        .select("*")
        .eq("id", id)
        .eq("published", true)
        .maybeSingle();
      if (!data) {
        setNotFound(true);
      } else {
        const s = data as unknown as Skript;
        setSk(s);
        setDownloadCount(s.downloads ?? 0);
        document.title = `${s.name} — Skript — Warden Network`;
        if (s.uploaded_by) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("display_name, mc_username")
            .eq("id", s.uploaded_by)
            .maybeSingle();
          if (prof) setUploader(prof as Uploader);
        }
      }
      setLoading(false);
    })();
  }, [id]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const doDownload = async () => {
    if (!sk) return;
    const { data, error } = await supabase.functions.invoke("skript-file-url", {
      body: { skript_id: sk.id },
    });
    if (error || !data?.url) {
      toast.error(error?.message ?? data?.error ?? "Download failed");
      return;
    }
    await supabase.rpc("record_user_skript_download" as any, { _skript_id: sk.id });
    try {
      const res = await fetch(data.signedUrl);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = sk.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(data.signedUrl, "_blank", "noopener");
    }
    setDownloadCount((n) => n + 1);
  };

  const uploaderName = uploader?.display_name || uploader?.mc_username || "Community";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageLoader loading={loading} label="Loading skript" />
      <Navbar />
      <main className="container pt-28 pb-16 max-w-6xl">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/skripts">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to skripts
          </Link>
        </Button>

        {notFound && !loading && (
          <Card className="p-10 text-center">
            <h1 className="text-2xl font-bold mb-2">Skript not found</h1>
            <p className="text-muted-foreground">
              The skript you're looking for doesn't exist or isn't published.
            </p>
          </Card>
        )}

        {sk && (
          <>
            {/* Header slab */}
            <div className="relative rounded-3xl border border-orange-500/25 bg-[radial-gradient(ellipse_at_top_right,hsl(24_95%_53%/0.18),transparent_60%),linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--background))_100%)] p-6 md:p-8 overflow-hidden">
              <div className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
              <div className="relative flex items-start gap-5 flex-wrap md:flex-nowrap">
                {sk.icon_url ? (
                  <img
                    src={sk.icon_url}
                    alt=""
                    className="h-24 w-24 rounded-xl object-cover border border-orange-500/30 shrink-0 bg-card shadow-[0_0_25px_-8px_hsl(24_95%_53%/0.4)]"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0">
                    <FileCode className="h-12 w-12 text-orange-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/40 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-widest text-orange-300 mb-2">
                    <FileCode className="h-3 w-3" /> Skript
                    {sk.version && <span className="text-orange-200/70">· v{sk.version}</span>}
                  </div>
                  <h1 className="text-3xl md:text-5xl font-display font-black leading-[1.05] tracking-tight">
                    {sk.name}
                  </h1>
                  {sk.description && (
                    <p className="text-sm md:text-base text-muted-foreground mt-2 line-clamp-3 max-w-2xl">
                      {sk.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1.5 font-mono">
                      <Download className="h-4 w-4" /> {downloadCount.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1.5 font-mono">
                      <Package className="h-4 w-4" /> {fmtBytes(sk.size_bytes)}
                    </span>
                    {sk.tags?.slice(0, 4).map((t) => (
                      <Badge key={t} variant="secondary" className="rounded-full">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    onClick={doDownload}
                    className="rounded-full px-6 bg-gradient-to-br from-orange-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white shadow-[0_0_20px_-4px_hsl(24_95%_53%/0.6)] border-0"
                  >
                    <Download className="h-4 w-4 mr-1.5" /> Download .sk
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" aria-label="More">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={copyLink}>
                        <LinkIcon className="h-4 w-4 mr-2" /> Copy link
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={doDownload}>
                        <Download className="h-4 w-4 mr-2" /> Download .sk
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="grid md:grid-cols-[1fr_320px] gap-6 mt-6">
              <Card className="p-6">
                <h2 className="font-display font-bold text-lg mb-3">Description</h2>
                {sk.description ? (
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {sk.description}
                  </p>
                ) : (
                  <p className="text-muted-foreground italic">No description provided.</p>
                )}
                {sk.tags?.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-border/60">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
                      Tags
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sk.tags.map((t) => (
                        <Badge key={t} variant="outline">{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-6 h-fit space-y-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                    Author
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-orange-400" />
                    <span>{uploaderName}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                    Filename
                  </div>
                  <div className="text-sm font-mono truncate">{sk.filename}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                    Size
                  </div>
                  <div className="text-sm">{fmtBytes(sk.size_bytes)}</div>
                </div>
                {sk.version && (
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                      Version
                    </div>
                    <div className="text-sm">v{sk.version}</div>
                  </div>
                )}
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                    Uploaded
                  </div>
                  <div className="text-sm flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {timeAgo(sk.created_at)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                    Downloads
                  </div>
                  <div className="text-sm font-mono">{downloadCount.toLocaleString()}</div>
                </div>
              </Card>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default SkriptDetail;
