import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { HelpCircle, Search, LifeBuoy, ThumbsUp, ThumbsDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { highlight } from "@/components/site/Highlight";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { SEO } from "@/components/site/SEO";
import { Helmet } from "react-helmet-async";

type Faq = { id: string; question: string; answer: string; category: string; sort_order: number };
type Counts = { helpful: number; not_helpful: number };

const VOTER_KEY = "faq_voter_key_v1";
const getVoterKey = () => {
  let k = localStorage.getItem(VOTER_KEY);
  if (!k) {
    k = crypto.randomUUID().replace(/-/g, "");
    localStorage.setItem(VOTER_KEY, k);
  }
  return k;
};

type SortMode = "default" | "helpful" | "newest";

const Faq = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<(Faq & { created_at?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [sort, setSort] = useState<SortMode>("default");
  const [counts, setCounts] = useState<Record<string, Counts>>({});
  const [myVotes, setMyVotes] = useState<Record<string, "helpful" | "not_helpful">>({});

  useEffect(() => {
    document.title = "FAQ — Warden Network";
    (async () => {
      const { data } = await (supabase.from("faqs" as any) as any)
        .select("id,question,answer,category,sort_order,created_at")
        .eq("published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      const list = (data as any[]) ?? [];
      setItems(list);
      setLoading(false);

      const { data: vc } = await (supabase.from("faq_vote_counts" as any) as any).select("*");
      const m: Record<string, Counts> = {};
      for (const r of (vc as any[]) ?? []) m[r.faq_id] = { helpful: r.helpful, not_helpful: r.not_helpful };
      setCounts(m);

      // my votes
      if (user) {
        const { data: votes } = await (supabase.from("faq_votes" as any) as any)
          .select("faq_id,vote")
          .eq("user_id", user.id);
        const mv: Record<string, any> = {};
        for (const v of (votes as any[]) ?? []) mv[v.faq_id] = v.vote;
        setMyVotes(mv);
      } else {
        const vk = getVoterKey();
        const { data: votes } = await (supabase.rpc as any)("get_anon_faq_votes", { _voter_key: vk });
        const mv: Record<string, any> = {};
        for (const v of (votes as any[]) ?? []) mv[v.faq_id] = v.vote;
        setMyVotes(mv);
      }
    })();
  }, [user]);

  const categories = useMemo(() => {
    const s = new Set(items.map((i) => i.category));
    return ["all", ...Array.from(s)];
  }, [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = items.filter((i) => {
      if (cat !== "all" && i.category !== cat) return false;
      if (!needle) return true;
      return i.question.toLowerCase().includes(needle) || i.answer.toLowerCase().includes(needle);
    });
    if (sort === "helpful") {
      list = [...list].sort((a, b) => (counts[b.id]?.helpful ?? 0) - (counts[a.id]?.helpful ?? 0));
    } else if (sort === "newest") {
      list = [...list].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    }
    return list;
  }, [items, q, cat, sort, counts]);

  const vote = async (faqId: string, v: "helpful" | "not_helpful") => {
    if (myVotes[faqId] === v) return;
    if (!user) {
      toast.error("Sign in to vote on FAQs");
      return;
    }
    const payload: any = { faq_id: faqId, vote: v };
    if (user) payload.user_id = user.id;
    else payload.voter_key = getVoterKey();

    // Optimistic
    const prev = myVotes[faqId];
    setMyVotes({ ...myVotes, [faqId]: v });
    setCounts({
      ...counts,
      [faqId]: {
        helpful: (counts[faqId]?.helpful ?? 0) + (v === "helpful" ? 1 : 0) - (prev === "helpful" ? 1 : 0),
        not_helpful: (counts[faqId]?.not_helpful ?? 0) + (v === "not_helpful" ? 1 : 0) - (prev === "not_helpful" ? 1 : 0),
      },
    });

    // Delete existing then insert (upsert is hard with conditional unique)
    if (prev) {
      const del = (supabase.from("faq_votes" as any) as any).delete().eq("faq_id", faqId);
      if (user) del.eq("user_id", user.id);
      else del.is("user_id", null).eq("voter_key", payload.voter_key);
      await del;
    }
    const { error } = await (supabase.from("faq_votes" as any) as any).insert(payload);
    if (error) {
      toast.error("Couldn't save vote");
      setMyVotes((mv) => {
        const copy = { ...mv };
        if (prev) copy[faqId] = prev;
        else delete copy[faqId];
        return copy;
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="FAQ — Warden Network"
        description="Answers to the most common questions about Warden Network — joining, ranks, Lifesteal mechanics, custom enchants, staff, and account support."
        path="/faq"
      />
      {items.length > 0 && (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: items.slice(0, 50).map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: (f.answer || "").replace(/[#>*_`~\[\]()]/g, "").replace(/\s+/g, " ").trim().slice(0, 1000),
              },
            })),
          })}</script>
        </Helmet>
      )}
      <Navbar />
      <main className="flex-1">
        <section className="relative pt-28 pb-10">
          <div className="absolute inset-0 bg-grid opacity-[0.06]" />
          <div className="container relative text-center">
            <Badge variant="secondary" className="mb-4 text-primary border-primary/40">
              <HelpCircle className="h-3 w-3 mr-1" /> Help Center
            </Badge>
            <h1 className="font-display text-4xl md:text-6xl font-black mb-3">
              Frequently Asked <span className="text-gradient">Questions</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Answers to the most common questions about Warden Network.
            </p>
          </div>
        </section>

        <div className="container pb-20 max-w-3xl">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search questions…"
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Button
                  key={c}
                  size="sm"
                  variant={cat === c ? "default" : "outline"}
                  onClick={() => setCat(c)}
                  className="capitalize"
                >
                  {c}
                </Button>
              ))}
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default order</SelectItem>
                <SelectItem value="helpful">Most helpful</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="text-muted-foreground">No matching questions.</p>
            </Card>
          ) : (
            <Card className="p-2">
              <Accordion type="single" collapsible className="w-full">
                {filtered.map((f) => {
                  const c = counts[f.id] ?? { helpful: 0, not_helpful: 0 };
                  const total = c.helpful + c.not_helpful;
                  const pct = total === 0 ? null : Math.round((c.helpful / total) * 100);
                  const my = myVotes[f.id];
                  return (
                    <AccordionItem key={f.id} value={f.id} className="px-3">
                      <AccordionTrigger className="text-left">
                        <span className="flex-1">{highlight(f.question, q)}</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="prose prose-sm prose-invert max-w-none text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary prose-code:text-primary prose-code:before:content-none prose-code:after:content-none prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              a: ({ node, ...props }) => (
                                <a {...props} target="_blank" rel="noopener noreferrer" />
                              ),
                              text: ({ children }) =>
                                typeof children === "string" ? <>{highlight(children, q)}</> : <>{children}</>,
                            }}
                          >
                            {f.answer}
                          </ReactMarkdown>
                        </div>
                        <div className="flex items-center gap-3 mt-4 pt-3 border-t">
                          <span className="text-xs text-muted-foreground">Was this helpful?</span>
                          <Button
                            size="sm"
                            variant={my === "helpful" ? "default" : "outline"}
                            className="h-7 gap-1"
                            onClick={() => vote(f.id, "helpful")}
                          >
                            <ThumbsUp className="h-3 w-3" /> {c.helpful}
                          </Button>
                          <Button
                            size="sm"
                            variant={my === "not_helpful" ? "default" : "outline"}
                            className="h-7 gap-1"
                            onClick={() => vote(f.id, "not_helpful")}
                          >
                            <ThumbsDown className="h-3 w-3" /> {c.not_helpful}
                          </Button>
                          {pct != null && (
                            <span className="text-xs text-muted-foreground">{pct}% found helpful</span>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </Card>
          )}

          <Card className="mt-8 p-6 text-center">
            <LifeBuoy className="h-6 w-6 mx-auto mb-2 text-primary" />
            <h3 className="font-display font-bold mb-1">Still need help?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Open a ticket and our staff will get back to you.
            </p>
            <Button asChild>
              <Link to="/support">Contact Support</Link>
            </Button>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Faq;
