import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { SEO } from "@/components/site/SEO";
import { CategoryCard, DirectoryNav } from "@/components/plugins/PluginDirectoryComponents";
import { PLUGIN_CATEGORIES, loadPluginDirectory, type PluginDirectoryItem } from "@/lib/plugin-directory";
import { Boxes, TrendingUp } from "lucide-react";

export default function PluginCategories() {
  const [plugins, setPlugins] = useState<PluginDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadPluginDirectory().then(setPlugins).finally(() => setLoading(false));
  }, []);
  const categories = useMemo(() => PLUGIN_CATEGORIES.map((category) => ({ category, count: plugins.filter((plugin) => plugin.category === category).length })), [plugins]);
  const popular = [...categories].sort((a, b) => b.count - a.count).slice(0, 4);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="Plugin Categories — WardenMC" description="Browse WardenMC plugins by category." path="/plugins/categories" />
      <Navbar />
      <main className="pb-20 pt-24">
        <section className="border-b border-border/70 bg-card/30"><div className="container max-w-[1400px] py-10 md:py-14"><DirectoryNav active="categories" /><div className="max-w-3xl py-9"><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-primary"><Boxes className="h-4 w-4" /> Plugin discovery</div><h1 className="font-display text-4xl font-black md:text-5xl">Plugin Categories</h1><p className="mt-3 text-base text-muted-foreground md:text-lg">Browse WardenMC plugins by category.</p></div></div></section>
        <div className="container max-w-[1400px] py-10">
          {!loading && plugins.length > 0 && <section className="mb-12"><div className="mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-orange-400" /><h2 className="font-display text-lg font-bold">Popular Categories</h2></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{popular.map(({ category, count }) => <CategoryCard key={category} category={category} count={count} />)}</div></section>}
          <section className="border-t border-border/70 pt-10"><h2 className="font-display text-2xl font-bold">All Categories</h2><p className="mt-1 text-sm text-muted-foreground">Explore the complete plugin catalog by purpose.</p>{loading ? <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 12 }).map((_, index) => <div key={index} className="h-60 animate-pulse rounded-md border border-border bg-card/60" />)}</div> : <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{categories.map(({ category, count }) => <CategoryCard key={category} category={category} count={count} />)}</div>}</section>
        </div>
      </main>
      <Footer />
    </div>
  );
}