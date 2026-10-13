import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { SEO } from "@/components/site/SEO";
import { GlassCard, PageHero, Reveal } from "@/components/site/ui-kit";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollText, CalendarDays, Tag } from "lucide-react";
import { toast } from "sonner";

type Entry = {
  id: string;
  title: string;
  content: string;
  category: string;
  version: string | null;
  entry_date: string;
  image_url: string | null;
};

const CATEGORY_STYLES: Record<string, string> = {
  feature: "border-emerald-400/40 text-emerald-300",
  improvement: "border-sky-400/40 text-sky-300",
  fix: "border-amber-400/40 text-amber-300",
  security: "border-red-400/40 text-red-300",
};

const categoryClass = (c: string) =>
  CATEGORY_STYLES[c.toLowerCase()] ?? "border-primary/40 text-primary";

const formatDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const Changelog = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Changelog — Warden Network";
    (async () => {
      const { data, error } = await supabase
        .from("changelog_entries")
        .select("id,title,content,category,version,entry_date,image_url")
        .eq("published", true)
        .order("entry_date", { ascending: false });
      if (error) toast.error(error.message);
      else setEntries((data ?? []) as Entry[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Changelog — Warden Network"
        description="Every update, fix and new feature on Warden Network, in order."
      />
      <Navbar />
      <main className="flex-1">
        <PageHero
          eyebrow={
            <>
              <ScrollText className="h-3 w-3 mr-1" /> Changelog
            </>
          }
          title="What's"
          highlight="New"
          description="Every update, fix and new feature on the network — newest first."
        >
          {!loading && entries.length > 0 && (
            <Badge variant="secondary" className="border-primary/30">
              {entries.length} update{entries.length === 1 ? "" : "s"} published
            </Badge>
          )}
        </PageHero>

        <div className="container pb-24 max-w-3xl">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-2xl" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <p className="text-muted-foreground">No updates published yet — check back soon.</p>
            </GlassCard>
          ) : (
            <div className="relative space-y-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border/50">
              {entries.map((e, i) => (
                <Reveal key={e.id} delay={Math.min(i * 60, 300)}>
                  <div className="relative pl-8">
                    <span className="absolute left-0 top-7 h-3.5 w-3.5 rounded-full border-2 border-primary bg-background shadow-[0_0_10px_hsl(var(--primary)/0.6)]" />
                    <GlassCard className="p-6">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="outline" className={categoryClass(e.category)}>
                          <Tag className="h-3 w-3 mr-1" />
                          {e.category}
                        </Badge>
                        {e.version && (
                          <Badge variant="secondary" className="font-mono text-xs">
                            v{e.version}
                          </Badge>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(e.entry_date)}
                        </span>
                      </div>
                      <h2 className="font-display text-2xl tracking-wide mb-2">{e.title}</h2>
                      {e.image_url && (
                        <img
                          src={e.image_url}
                          alt=""
                          className="mb-3 rounded-xl border border-border/40 max-h-64 w-full object-cover"
                        />
                      )}
                      <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                        {e.content}
                      </p>
                    </GlassCard>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Changelog;
