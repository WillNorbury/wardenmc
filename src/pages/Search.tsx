import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHero } from "@/components/site/ui-kit";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { userProfilePath } from "@/lib/userSlug";
import {
  Search as SearchIcon,
  Puzzle,
  Users as UsersIcon,
  HelpCircle,
  Handshake,
  ClipboardList,
  MessageSquare,
} from "lucide-react";

type Hit = {
  id: string;
  type: "Plugin" | "Player" | "Post" | "FAQ" | "Partner" | "Changelog";
  title: string;
  subtitle?: string;
  to: string;
};

const TYPE_ICON: Record<Hit["type"], any> = {
  Plugin: Puzzle,
  Player: UsersIcon,
  Post: MessageSquare,
  FAQ: HelpCircle,
  Partner: Handshake,
  Changelog: ClipboardList,
};

const TYPE_ORDER: Hit["type"][] = ["Plugin", "Player", "Post", "Partner", "FAQ", "Changelog"];

export default function Search() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("q") ?? "";
  const [q, setQ] = useState(initial);
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Search — Warden Network";
  }, []);

  useEffect(() => {
    const term = q.trim();
    setParams(term ? { q: term } : {}, { replace: true });
    if (!term) {
      setHits([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const like = `%${term}%`;
      const results: Hit[] = [];
      const [plugins, profiles, posts, faqs, partners, changelog] = await Promise.all([
        supabase.from("plugins").select("id,short_id,slug,name,description").eq("published", true).ilike("name", like).limit(20),
        supabase.from("profiles").select("id,display_name,mc_username,bio").or(`display_name.ilike.${like},mc_username.ilike.${like}`).limit(20),
        supabase.from("posts").select("id,content").ilike("content", like).limit(20),
        (supabase.from("faqs" as any) as any).select("id,question,answer").eq("published", true).or(`question.ilike.${like},answer.ilike.${like}`).limit(20),
        supabase.from("partners").select("id,name,slug,description,server_address").or(`name.ilike.${like},description.ilike.${like},server_address.ilike.${like}`).limit(20),
        supabase.from("changelog_entries").select("id,title,content,category").eq("published", true).or(`title.ilike.${like},content.ilike.${like}`).limit(20),
      ]);
      (plugins.data ?? []).forEach((p: any) =>
        results.push({ id: `pl-${p.id}`, type: "Plugin", title: p.name, subtitle: p.description ?? undefined, to: `/plugin/${p.slug ?? p.short_id}` })
      );
      (profiles.data ?? []).forEach((u: any) =>
        results.push({ id: `u-${u.id}`, type: "Player", title: u.display_name || u.mc_username || "Player", subtitle: u.mc_username ?? undefined, to: userProfilePath(u) })
      );
      (posts.data ?? []).forEach((p: any) =>
        results.push({ id: `po-${p.id}`, type: "Post", title: p.content.length > 80 ? `${p.content.slice(0, 80)}…` : p.content, to: "/posts" })
      );
      (partners.data ?? []).forEach((p: any) =>
        results.push({ id: `pa-${p.id}`, type: "Partner", title: p.name, subtitle: p.server_address ?? p.description ?? undefined, to: `/partners/${p.slug ?? p.id}` })
      );
      (faqs.data ?? []).forEach((f: any) =>
        results.push({ id: `q-${f.id}`, type: "FAQ", title: f.question, to: "/faq" })
      );
      (changelog.data ?? []).forEach((c: any) =>
        results.push({ id: `c-${c.id}`, type: "Changelog", title: c.title, subtitle: c.category, to: "/changelog" })
      );
      if (!cancelled) {
        setHits(results);
        setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const grouped = useMemo(() => {
    const map = new Map<Hit["type"], Hit[]>();
    for (const h of hits) {
      const arr = map.get(h.type) ?? [];
      arr.push(h);
      map.set(h.type, arr);
    }
    return TYPE_ORDER.filter((t) => map.has(t)).map((t) => ({ type: t, items: map.get(t)! }));
  }, [hits]);

  return (
    <div className="container mx-auto max-w-4xl px-4 pb-16">
      <PageHero
        eyebrow="Find anything"
        title="SEARCH"
        highlight="WARDENMC"
        description="Search plugins, players, posts, partners, FAQs and changelog entries across the whole site."
      />

      <div className="relative mt-8">
        <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search plugins, players, posts…"
          className="h-14 rounded-2xl border-border/60 bg-card/60 pl-12 text-lg backdrop-blur"
        />
      </div>

      <div className="mt-8 space-y-8">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        )}

        {!loading && q.trim() && hits.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">
            No results for “{q.trim()}”. Try a different word.
          </p>
        )}

        {!loading && !q.trim() && (
          <p className="py-12 text-center text-muted-foreground">
            Start typing to search the whole site.
          </p>
        )}

        {!loading &&
          grouped.map(({ type, items }) => {
            const Icon = TYPE_ICON[type];
            return (
              <section key={type}>
                <div className="mb-3 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <h2 className="font-heading text-xl tracking-wide">
                    {type === "FAQ" ? "FAQs" : `${type}s`}
                  </h2>
                  <Badge variant="secondary">{items.length}</Badge>
                </div>
                <div className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 bg-card/50 backdrop-blur">
                  {items.map((h) => (
                    <Link
                      key={h.id}
                      to={h.to}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{h.title}</p>
                        {h.subtitle && (
                          <p className="truncate text-sm text-muted-foreground">{h.subtitle}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {h.type}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
}
