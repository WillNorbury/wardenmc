import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import PageLoader from "@/components/site/PageLoader";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft,
  Server as ServerIcon,
  Copy,
  Users,
  Globe,
  MessageCircle,
  Calendar,
  Signal,
} from "lucide-react";

type Row = {
  id: string;
  name: string;
  slug: string;
  ip: string;
  port: number | null;
  description: string | null;
  long_description: string | null;
  version: string | null;
  tags: string[];
  icon_url: string | null;
  banner_url: string | null;
  website_url: string | null;
  discord_url: string | null;
  featured: boolean;
  created_at: string;
  updated_at: string;
};

type Live = { online: boolean; players: number; max: number; motd?: string | null };

export default function ServerDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState<Live | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("user_servers")
        .select("id, name, slug, ip, port, description, long_description, version, tags, icon_url, banner_url, website_url, discord_url, featured, created_at, updated_at")
        .eq("slug", slug!)
        .eq("published", true)
        .maybeSingle();
      setRow((data as Row) ?? null);
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    if (!row) return;
    const addr = row.port ? `${row.ip}:${row.port}` : row.ip;
    let cancelled = false;
    fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(addr)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setLive({
          online: !!j?.online,
          players: j?.players?.online ?? 0,
          max: j?.players?.max ?? 0,
          motd: j?.motd?.clean?.join?.(" ") ?? null,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [row]);

  const copyIp = () => {
    if (!row) return;
    navigator.clipboard.writeText(row.port ? `${row.ip}:${row.port}` : row.ip);
    toast.success("IP copied");
  };

  if (loading) return <PageLoader loading />;

  if (!row) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold mb-2">Server not found</h1>
          <p className="text-muted-foreground mb-6">This listing may have been removed or unpublished.</p>
          <Button asChild variant="outline">
            <Link to="/servers">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to servers
            </Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const addr = row.port ? `${row.ip}:${row.port}` : row.ip;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Link
          to="/servers"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> All servers
        </Link>

        {/* Header slab */}
        <div className="relative overflow-hidden rounded-xl border border-orange-500/20 bg-gradient-to-br from-card via-card to-orange-500/5 p-5 md:p-6 mb-4">
          <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-orange-400 via-orange-500 to-rose-600" />
          <div className="flex flex-col md:flex-row gap-4 md:items-center pl-2">
            {row.icon_url ? (
              <img src={row.icon_url} alt={`${row.name} icon`} className="h-16 w-16 rounded-lg object-cover border border-orange-500/30" />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                <ServerIcon className="h-8 w-8 text-orange-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold truncate">{row.name}</h1>
                <Badge variant="outline" className={live?.online ? "border-emerald-500/40 text-emerald-400" : "text-muted-foreground"}>
                  <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${live?.online ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
                  {live ? (live.online ? "Online" : "Offline") : "Checking…"}
                </Badge>
                {row.featured && <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/40">Featured</Badge>}
              </div>
              {row.description && <p className="text-sm text-muted-foreground mt-1">{row.description}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={copyIp} className="font-mono">
                <Copy className="h-4 w-4 mr-2" /> {addr}
              </Button>
              {row.website_url && (
                <Button asChild variant="outline">
                  <a href={row.website_url} target="_blank" rel="noreferrer">
                    <Globe className="h-4 w-4 mr-2" /> Website
                  </a>
                </Button>
              )}
              {row.discord_url && (
                <Button asChild variant="outline">
                  <a href={row.discord_url} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4 mr-2" /> Discord
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-4">
          <Card className="p-5">
            <h2 className="font-display font-bold text-sm uppercase tracking-wider mb-3">Description</h2>
            <div className="prose prose-invert prose-sm max-w-none text-foreground/90 prose-img:rounded-lg prose-a:text-primary">
              {row.long_description || row.description ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {row.long_description || row.description || ""}
                </ReactMarkdown>
              ) : (
                <span className="text-muted-foreground">No description provided.</span>
              )}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5 space-y-3 text-sm">
              <h2 className="font-display font-bold text-sm uppercase tracking-wider">Details</h2>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Players</span>
                <span className="font-mono">{live ? `${live.players}/${live.max}` : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground inline-flex items-center gap-1.5"><Signal className="h-3.5 w-3.5" /> Version</span>
                <span className="font-mono">{row.version || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Updated</span>
                <span className="font-mono">{new Date(row.updated_at).toLocaleDateString()}</span>
              </div>
              {live?.motd && (
                <div className="pt-2 border-t border-border/60 text-xs text-muted-foreground italic">{live.motd}</div>
              )}
            </Card>

            {row.tags.length > 0 && (
              <Card className="p-5">
                <h2 className="font-display font-bold text-sm uppercase tracking-wider mb-3">Gamemodes</h2>
                <div className="flex flex-wrap gap-1.5">
                  {row.tags.map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
