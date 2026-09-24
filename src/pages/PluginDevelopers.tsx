import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { SEO } from "@/components/site/SEO";
import { DeveloperCard, DirectoryNav, PluginSearch } from "@/components/plugins/PluginDirectoryComponents";
import { buildDevelopers, loadPluginDirectory, type PluginDeveloper } from "@/lib/plugin-directory";
import { Card } from "@/components/ui/card";
import { Code2, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type DeveloperSort = "plugins" | "downloads" | "rating" | "active" | "name";

export default function PluginDevelopers() {
  const [developers, setDevelopers] = useState<PluginDeveloper[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<DeveloperSort>("plugins");
  useEffect(() => {
    loadPluginDirectory().then((plugins) => setDevelopers(buildDevelopers(plugins))).finally(() => setLoading(false));
  }, []);
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = developers.filter((developer) => !needle || [developer.displayName, developer.username, developer.bio ?? ""].join(" ").toLowerCase().includes(needle));
    return [...filtered].sort((a, b) => {
      if (sort === "downloads") return b.downloads - a.downloads;
      if (sort === "rating") return b.rating - a.rating || b.reviewCount - a.reviewCount;
      if (sort === "active") return new Date(b.recentlyActiveAt).getTime() - new Date(a.recentlyActiveAt).getTime();
      if (sort === "name") return a.displayName.localeCompare(b.displayName);
      return b.pluginCount - a.pluginCount;
    });
  }, [developers, query, sort]);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="Plugin Developers — WardenMC" description="Meet the developers building plugins for the WardenMC community." path="/plugins/developers" />
      <Navbar />
      <main className="pb-20 pt-24">
        <section className="border-b border-border/70 bg-card/30"><div className="container max-w-[1400px] py-10 md:py-14"><DirectoryNav active="developers" /><div className="max-w-3xl py-9"><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-primary"><Code2 className="h-4 w-4" /> Creator network</div><h1 className="font-display text-4xl font-black md:text-5xl">Plugin Developers</h1><p className="mt-3 text-base text-muted-foreground md:text-lg">Meet the developers building plugins for the WardenMC community.</p></div></div></section>
        <div className="container max-w-[1400px] py-10">
          <div className="flex flex-col gap-3 border-b border-border/70 pb-6 md:flex-row"><PluginSearch value={query} onChange={setQuery} placeholder="Search developers..." /><Select value={sort} onValueChange={(value) => setSort(value as DeveloperSort)}><SelectTrigger className="h-12 w-full md:w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="plugins">Most Plugins</SelectItem><SelectItem value="downloads">Most Downloads</SelectItem><SelectItem value="rating">Highest Rated</SelectItem><SelectItem value="active">Recently Active</SelectItem><SelectItem value="name">A–Z</SelectItem></SelectContent></Select></div>
          <div className="mb-5 mt-8 flex items-end justify-between"><div><h2 className="font-display text-2xl font-bold">Developer Directory</h2><p className="mt-1 text-sm text-muted-foreground">{loading ? "Loading developers…" : `${shown.length} ${shown.length === 1 ? "developer" : "developers"}`}</p></div></div>
          {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-[290px] animate-pulse rounded-md border border-border bg-card/60" />)}</div> : shown.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{shown.map((developer) => <DeveloperCard key={developer.id} developer={developer} />)}</div> : <Card className="py-16 text-center"><Users className="mx-auto h-10 w-10 text-muted-foreground" /><h3 className="mt-4 font-display text-xl font-bold">No developers found</h3><p className="mt-2 text-muted-foreground">Try a different name or search term.</p></Card>}
        </div>
      </main>
      <Footer />
    </div>
  );
}