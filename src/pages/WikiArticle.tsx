import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, BookOpen, CalendarDays, ChevronRight, Clock3, FileText, Hash, ListTree } from "lucide-react";
import { cn } from "@/lib/utils";

type Article = { title: string; content: string; category: string | null; excerpt: string | null; updated_at: string };

type Heading = { id: string; text: string; level: number };

const SITE_URL = "https://www.warden.rip";

const slugifyHeading = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const plainText = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(plainText).join("");
  if (value && typeof value === "object" && "props" in value) {
    return plainText((value as { props?: { children?: unknown } }).props?.children);
  }
  return "";
};

const extractHeadings = (markdown: string): Heading[] => {
  const used = new Map<string, number>();
  return markdown
    .split("\n")
    .map((line) => line.match(/^(#{2,3})\s+(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => {
      const text = match[2].replace(/[#*_`~]/g, "").trim();
      const base = slugifyHeading(text) || "section";
      const count = used.get(base) ?? 0;
      used.set(base, count + 1);
      return {
        id: count ? `${base}-${count + 1}` : base,
        text,
        level: match[1].length,
      };
    });
};

const formatDate = (value?: string) => {
  if (!value) return "Recently updated";
  return new Date(value).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
};

const readingMinutes = (content: string) => {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
};

export default function WikiArticle() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeHeading, setActiveHeading] = useState("");

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("wiki_articles")
      .select("title, content, category, excerpt, updated_at")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle()
      .then(({ data }) => {
        setArticle(data as Article | null);
        setLoading(false);
      });
  }, [slug]);

  const headings = useMemo(() => extractHeadings(article?.content ?? ""), [article?.content]);

  useEffect(() => {
    if (!headings.length) return;
    setActiveHeading(headings[0].id);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveHeading(visible.target.id);
      },
      { rootMargin: "-112px 0px -72% 0px", threshold: 0 },
    );
    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [headings]);

  const canonicalPath = `/wiki/${slug ?? ""}`;
  const title = article ? `${article.title} — Wiki — Warden Network` : "Wiki Article — Warden Network";
  const description =
    article?.excerpt ||
    (article?.content ?? "")
      .slice(0, 155)
      .replace(/\s+/g, " ")
      .trim() ||
    "Warden Network wiki article.";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`${SITE_URL}${canonicalPath}`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${SITE_URL}${canonicalPath}`} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        {article && (
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.title,
            datePublished: article.updated_at,
            dateModified: article.updated_at,
            articleSection: article.category || undefined,
            description,
            mainEntityOfPage: `${SITE_URL}${canonicalPath}`,
            publisher: {
              "@type": "Organization",
              name: "Warden Network",
              logo: { "@type": "ImageObject", url: `${SITE_URL}/icon-512.png` },
            },
          })}</script>
        )}
      </Helmet>
      <Navbar />
      <main className="flex-1">
        {loading ? (
          <div className="container max-w-6xl pt-28 pb-20">
            <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
              <div className="space-y-6">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-16 w-3/4" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-80 w-full" />
              </div>
              <Skeleton className="hidden h-72 lg:block" />
            </div>
          </div>
        ) : !article ? (
          <section className="container max-w-3xl py-28 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-card text-primary">
              <FileText className="h-6 w-6" />
            </div>
            <h1 className="font-display text-3xl font-black">Article not found</h1>
            <p className="mt-3 text-muted-foreground">This article may have moved, been unpublished, or been removed.</p>
            <Button asChild className="mt-7">
              <Link to="/wiki">
                <ArrowLeft className="h-4 w-4" /> Back to wiki
              </Link>
            </Button>
          </section>
        ) : (
          <>
            <section className="relative overflow-hidden border-b border-border/70 pt-24 pb-10 md:pt-28 md:pb-14">
              <div className="absolute inset-0 bg-grid opacity-[0.06]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <div className="container relative max-w-6xl">
                <Button asChild variant="ghost" size="sm" className="mb-7 text-muted-foreground hover:text-foreground">
                  <Link to="/wiki">
                    <ArrowLeft className="h-4 w-4" /> Wiki
                  </Link>
                </Button>

                <div className="grid gap-8 lg:grid-cols-[1fr_280px] lg:items-end">
                  <header className="min-w-0">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                        <BookOpen className="mr-1 h-3 w-3" /> {article.category || "Wiki"}
                      </Badge>
                      <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5" /> {readingMinutes(article.content)} min read
                      </span>
                    </div>
                    <h1 className="font-display text-3xl font-black leading-tight sm:text-4xl md:text-5xl">
                      {article.title}
                    </h1>
                    {article.excerpt && (
                      <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
                        {article.excerpt}
                      </p>
                    )}
                  </header>

                  <aside className="rounded-lg border border-border bg-card/70 p-4 backdrop-blur-md">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                      <CalendarDays className="h-4 w-4 text-primary" /> Updated
                    </div>
                    <p className="mt-2 font-display text-lg font-bold">{formatDate(article.updated_at)}</p>
                    <div className="mt-4 h-px bg-border/70" />
                    <Link
                      to="/wiki/more"
                      className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-foreground"
                    >
                      Browse all articles <ChevronRight className="h-4 w-4" />
                    </Link>
                  </aside>
                </div>
              </div>
            </section>

            <div className="container max-w-6xl py-10 md:py-14">
              <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
                <article className="min-w-0 rounded-lg border border-border bg-card/70 px-5 py-6 shadow-elegant md:px-8 md:py-9">
                  <div className="prose prose-invert max-w-none prose-headings:text-foreground prose-headings:tracking-tight prose-p:text-muted-foreground prose-p:leading-relaxed prose-strong:text-foreground prose-li:text-muted-foreground prose-blockquote:border-primary prose-blockquote:bg-secondary/50 prose-blockquote:px-5 prose-blockquote:py-2 prose-code:before:content-none prose-code:after:content-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h2: ({ children }) => {
                        const id = slugifyHeading(plainText(children));
                        return (
                          <h2 id={id} className="scroll-mt-28 font-display text-2xl font-black">
                            {children}
                          </h2>
                        );
                      },
                      h3: ({ children }) => {
                        const id = slugifyHeading(plainText(children));
                        return (
                          <h3 id={id} className="scroll-mt-28 font-display text-xl font-bold">
                            {children}
                          </h3>
                        );
                      },
                      a: ({ href, children }) => (
                        <a href={href} className="font-medium text-primary underline underline-offset-4 hover:text-foreground">
                          {children}
                        </a>
                      ),
                      table: ({ children }) => (
                        <div className="my-6 overflow-x-auto rounded-lg border border-border">
                          <table className="w-full min-w-[560px] border-collapse text-sm">{children}</table>
                        </div>
                      ),
                      th: ({ children }) => <th className="border-b border-border bg-secondary px-4 py-3 text-left font-bold">{children}</th>,
                      td: ({ children }) => <td className="border-b border-border px-4 py-3 text-muted-foreground">{children}</td>,
                      code: ({ children, className }) => (
                        <code
                          className={cn(
                            "rounded border border-border bg-secondary px-1.5 py-0.5 text-sm text-primary",
                            className,
                          )}
                        >
                          {children}
                        </code>
                      ),
                    }}
                  >
                    {article.content || ""}
                  </ReactMarkdown>
                  </div>
                </article>

                <aside className="hidden lg:sticky lg:top-24 lg:block">
                  <div className="rounded-lg border border-border bg-card/70 p-5 backdrop-blur-md">
                    <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                      <ListTree className="h-4 w-4 text-primary" /> In this article
                    </div>
                    {headings.length > 0 ? (
                      <nav aria-label="Article sections" className="space-y-1 border-l border-border/70">
                        {headings.map((heading) => (
                          <a
                            key={heading.id}
                            href={`#${heading.id}`}
                            className={cn(
                              "block border-l-2 py-1.5 pr-2 text-sm transition-colors",
                              heading.level === 3 ? "pl-7" : "pl-4",
                              activeHeading === heading.id
                                ? "-ml-px border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {heading.text}
                          </a>
                        ))}
                      </nav>
                    ) : (
                      <p className="text-sm text-muted-foreground">Quick reference article</p>
                    )}
                  </div>
                </aside>
              </div>

              <div className="mt-10 flex flex-col gap-3 border-t border-border/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <Button asChild variant="outline">
                  <Link to="/wiki">
                    <ArrowLeft className="h-4 w-4" /> Back to wiki
                  </Link>
                </Button>
                <Link to="/support" className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary">
                  Need help? Contact support <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
