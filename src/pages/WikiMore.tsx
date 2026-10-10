import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Search, ChevronLeft, ChevronRight, FileText } from "lucide-react";

type Article = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  excerpt: string | null;
  updated_at?: string | null;
};

const PAGE_SIZE = 20;
const EMBER = "#ff5722";

export default function WikiMore() {
  const [items, setItems] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    supabase
      .from("wiki_articles")
      .select("id, slug, title, category, excerpt, updated_at")
      .eq("published", true)
      .order("category", { ascending: true, nullsFirst: false })
      .order("title", { ascending: true })
      .then(({ data }) => {
        setItems((data as Article[]) ?? []);
        setLoading(false);
      });
  }, []);

  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const a of items) s.add(a.category || "Uncategorized");
    return ["all", ...Array.from(s).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((a) => {
      const cat = a.category || "Uncategorized";
      if (category !== "all" && cat !== category) return false;
      if (!needle) return true;
      return (
        a.title.toLowerCase().includes(needle) ||
        a.slug.toLowerCase().includes(needle) ||
        (a.excerpt ?? "").toLowerCase().includes(needle) ||
        cat.toLowerCase().includes(needle)
      );
    });
  }, [items, q, category]);

  useEffect(() => {
    setPage(1);
  }, [q, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="min-h-screen flex flex-col bg-background text-neutral-100">
      <Helmet>
        <title>More Wiki — Warden Network Archive</title>
        <meta name="description" content="Full searchable index of every Warden Network wiki article." />
      </Helmet>
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <section className="border-b border-neutral-800 bg-gradient-to-b from-card to-background">
          <div className="container mx-auto px-4 py-10 md:py-14 max-w-6xl">
            <Link to="/wiki" className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-neutral-400 hover:text-neutral-200">
              <ChevronLeft className="w-3 h-3" /> Back to Wiki
            </Link>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-px flex-1 bg-neutral-800" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">Archive · Full Index</span>
              <div className="h-px flex-1 bg-neutral-800" />
            </div>
            <h1
              className="mt-4 text-4xl md:text-6xl font-black tracking-tight"
              style={{ fontFamily: '"Press Start 2P", system-ui, sans-serif', lineHeight: 1.1 }}
            >
              MORE <span style={{ color: EMBER }}>WIKI</span>
            </h1>
            <p className="mt-3 max-w-2xl text-neutral-400">
              Every published article, searchable and filterable. {items.length} entries in the archive.
            </p>

            {/* Search + filter */}
            <div className="mt-6 flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search articles, slugs, categories…"
                  className="w-full pl-10 pr-3 py-3 bg-card border border-neutral-800 focus:border-primary outline-none text-sm rounded-none"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto md:flex-wrap">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-3 py-2 text-xs uppercase tracking-widest whitespace-nowrap border transition ${
                      category === c
                        ? "border-primary text-primary bg-primary/10"
                        : "border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700"
                    }`}
                  >
                    {c === "all" ? `All (${items.length})` : c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* List */}
        <section className="container mx-auto px-4 py-10 max-w-6xl">
          {loading ? (
            <p className="text-neutral-500">Loading archive…</p>
          ) : filtered.length === 0 ? (
            <div className="border border-dashed border-neutral-800 p-12 text-center">
              <p className="text-neutral-400">No articles match your search.</p>
            </div>
          ) : (
            <>
              <div className="text-xs uppercase tracking-widest text-neutral-500 mb-4">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </div>
              <ul className="divide-y divide-neutral-800 border-y border-neutral-800">
                {current.map((a, i) => (
                  <li key={a.id}>
                    <Link
                      to={`/wiki/${a.slug}`}
                      className="group grid grid-cols-[auto_1fr_auto] gap-4 items-center py-4 px-2 hover:bg-card transition"
                    >
                      <span className="text-neutral-600 font-mono text-xs w-10 text-right">
                        {String((page - 1) * PAGE_SIZE + i + 1).padStart(3, "0")}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] uppercase tracking-widest text-neutral-500">
                            {a.category || "Uncategorized"}
                          </span>
                          <span className="text-neutral-700">·</span>
                          <span className="text-[10px] font-mono text-neutral-600">/{a.slug}</span>
                        </div>
                        <h3 className="mt-1 text-base md:text-lg font-semibold text-neutral-100 group-hover:text-primary transition truncate">
                          {a.title}
                        </h3>
                        {a.excerpt && (
                          <p className="text-sm text-neutral-500 line-clamp-1">{a.excerpt}</p>
                        )}
                      </div>
                      <FileText className="w-4 h-4 text-neutral-700 group-hover:text-primary transition" />
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-between gap-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center gap-1 px-4 py-2 text-xs uppercase tracking-widest border border-neutral-800 hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-neutral-800 disabled:hover:text-current"
                  >
                    <ChevronLeft className="w-3 h-3" /> Prev
                  </button>
                  <div className="flex gap-1 flex-wrap justify-center">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const n = i + 1;
                      const show =
                        n === 1 ||
                        n === totalPages ||
                        Math.abs(n - page) <= 1;
                      if (!show) {
                        if (n === 2 || n === totalPages - 1)
                          return <span key={n} className="px-2 text-neutral-600">…</span>;
                        return null;
                      }
                      return (
                        <button
                          key={n}
                          onClick={() => setPage(n)}
                          className={`w-9 h-9 text-xs font-mono border ${
                            n === page
                              ? "border-primary text-primary bg-primary/10"
                              : "border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700"
                          }`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="inline-flex items-center gap-1 px-4 py-2 text-xs uppercase tracking-widest border border-neutral-800 hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-neutral-800 disabled:hover:text-current"
                  >
                    Next <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
