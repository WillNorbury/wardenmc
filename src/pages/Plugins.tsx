import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, PackageSearch, Sparkles } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { SEO } from "@/components/site/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CategoryCard,
  DirectoryNav,
  FeaturedPluginCard,
  PluginCard,
  PluginFilters,
  PluginSearch,
  PluginStats,
  type PluginFilterState,
} from "@/components/plugins/PluginDirectoryComponents";
import { MC_VERSIONS, PLUGIN_CATEGORIES, loadPluginDirectory, type PluginDirectoryItem } from "@/lib/plugin-directory";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SortOption = "featured" | "downloads" | "updated" | "newest" | "rating" | "name";
const PAGE_SIZE = 12;
const EMPTY_FILTERS: PluginFilterState = { category: "", version: "", platform: "", verification: "" };

export default function Plugins() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [plugins, setPlugins] = useState<PluginDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("featured");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<PluginFilterState>({
    ...EMPTY_FILTERS,
    category: searchParams.get("category") ?? "",
  });

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setPlugins(await loadPluginDirectory(user?.id));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.id]);

  useEffect(() => {
    const category = searchParams.get("category") ?? "";
    setFilters((current) => current.category === category ? current : { ...current, category });
  }, [searchParams]);

  const updateFilters = (next: PluginFilterState) => {
    setFilters(next);
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (next.category) params.set("category", next.category.toLowerCase());
    else params.delete("category");
    setSearchParams(params, { replace: true });
  };

  const clearFilters = () => {
    setQuery("");
    updateFilters(EMPTY_FILTERS);
  };

  const availableVersions = useMemo(() => [...new Set([...MC_VERSIONS, ...plugins.flatMap((plugin) => plugin.versions)])].sort((a, b) => b.localeCompare(a, undefined, { numeric: true })), [plugins]);
  const activeFilterCount = Object.values(filters).filter(Boolean).length + (query.trim() ? 1 : 0);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const result = plugins.filter((plugin) => {
      const searchable = [plugin.name, plugin.description, plugin.developer.displayName, plugin.developer.username, plugin.category, plugin.sourceCategory ?? "", ...plugin.tags].join(" ").toLowerCase();
      if (needle && !searchable.includes(needle)) return false;
      if (filters.category && plugin.category.toLowerCase() !== filters.category.toLowerCase()) return false;
      if (filters.version && !plugin.versions.includes(filters.version)) return false;
      if (filters.platform && !plugin.platforms.some((platform) => platform.toLowerCase() === filters.platform.toLowerCase())) return false;
      if (filters.verification === "Verified" && !plugin.verified) return false;
      if (filters.verification === "Unverified" && plugin.verified) return false;
      return true;
    });
    return [...result].sort((a, b) => {
      if (sort === "downloads") return b.downloads - a.downloads;
      if (sort === "updated") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sort === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === "rating") return b.rating - a.rating || b.reviews - a.reviews;
      if (sort === "name") return a.name.localeCompare(b.name);
      return Number(b.featured) - Number(a.featured) || b.downloads - a.downloads;
    });
  }, [plugins, query, filters, sort]);

  useEffect(() => { setPage(1); }, [query, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const featured = plugins.filter((plugin) => plugin.featured).slice(0, 3);
  const featuredFallback = featured.length ? featured : [...plugins].sort((a, b) => b.downloads - a.downloads).slice(0, 3);
  const categoryCounts = PLUGIN_CATEGORIES.map((category) => ({ category, count: plugins.filter((plugin) => plugin.category === category).length }));

  const toggleFavorite = async (plugin: PluginDirectoryItem) => {
    if (!user) {
      toast.error("Sign in to favorite plugins");
      navigate("/auth");
      return;
    }
    setPlugins((current) => current.map((item) => item.id === plugin.id ? { ...item, isFavorite: !item.isFavorite, favorites: Math.max(0, item.favorites + (item.isFavorite ? -1 : 1)) } : item));
    const { data, error } = await supabase.rpc("toggle_plugin_favorite", { _plugin_id: plugin.id });
    if (error) {
      toast.error("Could not update favorite");
      await load();
      return;
    }
    setPlugins((current) => current.map((item) => item.id === plugin.id ? { ...item, isFavorite: Boolean(data) } : item));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="Plugin Directory — WardenMC" description="Discover plugins built for Minecraft servers, networks, and communities." path="/plugins" />
      <Navbar />
      <main className="pb-20 pt-24">
        <section className="border-b border-border/70 bg-card/30">
          <div className="container max-w-[1400px] py-10 md:py-14">
            <DirectoryNav active="plugins" />
            <div className="max-w-3xl py-9">
              <div className="mb-3 text-xs font-semibold uppercase text-primary">WARDENMC • PLUGIN DIRECTORY</div>
              <h1 className="font-display text-4xl font-black md:text-5xl">Plugin Directory</h1>
              <p className="mt-3 text-base text-muted-foreground md:text-lg">Discover plugins built for Minecraft servers, networks, and communities.</p>
            </div>
            <PluginStats plugins={plugins} />
          </div>
        </section>

        <div className="container max-w-[1400px] pt-8">
          <div className="flex flex-col gap-3 border-b border-border/70 pb-6 md:flex-row">
            <PluginSearch value={query} onChange={(value) => { setQuery(value); setPage(1); }} />
            <Select value={sort} onValueChange={(value) => setSort(value as SortOption)}>
              <SelectTrigger className="h-12 w-full bg-background/70 md:w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured</SelectItem><SelectItem value="downloads">Most Downloads</SelectItem>
                <SelectItem value="updated">Recently Updated</SelectItem><SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem><SelectItem value="name">A–Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!loading && featuredFallback.length > 0 && (
            <section className="py-10">
              <div className="mb-5 flex items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-primary"><Sparkles className="h-4 w-4" /><span className="text-xs font-semibold uppercase">Curated by WardenMC</span></div><h2 className="mt-1 font-display text-2xl font-bold">Featured Plugins</h2></div></div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{featuredFallback.map((plugin) => <FeaturedPluginCard key={plugin.id} plugin={plugin} />)}</div>
            </section>
          )}

          <section className="border-t border-border/70 pt-10">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div><h2 className="font-display text-2xl font-bold">All Plugins</h2><p className="mt-1 text-sm text-muted-foreground">Browse every published plugin in the WardenMC ecosystem.</p></div>
              {activeFilterCount > 0 && <Button variant="ghost" onClick={clearFilters}>Clear Filters</Button>}
            </div>
            <div className="flex flex-col gap-7 lg:flex-row">
              <PluginFilters value={filters} onChange={updateFilters} versions={availableVersions} activeCount={activeFilterCount} onClear={clearFilters} />
              <div className="min-w-0 flex-1">
                <div className="mb-4 flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{loading ? "Loading plugins…" : `Showing ${filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} plugins`}</p></div>
                {loading ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-[330px] animate-pulse rounded-md border border-border bg-card/60" />)}</div>
                ) : loadError ? (
                  <Card className="py-16 text-center"><PackageSearch className="mx-auto h-9 w-9 text-muted-foreground" /><h3 className="mt-4 font-display text-lg font-bold">Couldn’t load plugins</h3><Button className="mt-4" variant="outline" onClick={load}>Try Again</Button></Card>
                ) : shown.length === 0 ? (
                  <Card className="py-16 text-center"><PackageSearch className="mx-auto h-10 w-10 text-muted-foreground" /><h3 className="mt-4 font-display text-xl font-bold">No plugins found</h3><p className="mt-2 text-muted-foreground">Try adjusting your search or clearing your filters.</p><Button className="mt-5" variant="outline" onClick={clearFilters}>Clear Filters</Button></Card>
                ) : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{shown.map((plugin) => <PluginCard key={plugin.id} plugin={plugin} onFavorite={toggleFavorite} />)}</div>}
                {pageCount > 1 && <div className="mt-8 flex items-center justify-center gap-3"><Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage((current) => current - 1)} aria-label="Previous page"><ChevronLeft /></Button><span className="text-sm text-muted-foreground">Page {page} of {pageCount}</span><Button variant="outline" size="icon" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)} aria-label="Next page"><ChevronRight /></Button></div>}
              </div>
            </div>
          </section>

          <section className="mt-16 border-t border-border/70 pt-10">
            <div className="mb-6 flex items-end justify-between gap-4"><div><h2 className="font-display text-2xl font-bold">Browse by Category</h2><p className="mt-1 text-sm text-muted-foreground">Find plugins for the job at hand.</p></div><Button asChild variant="outline"><Link to="/plugins/categories">View All Categories <ArrowRight /></Link></Button></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{categoryCounts.slice(0, 10).map(({ category, count }) => <CategoryCard key={category} category={category} count={count} />)}</div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}