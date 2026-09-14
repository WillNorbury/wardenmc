import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { Check, X } from "lucide-react";

type Item = {
  id: string;
  name: string;
  price: number | null;
  currency: string | null;
  perks: string[] | null;
  sort_order: number;
  category_id: string;
};

type Category = { id: string; slug: string; name: string; sort_order: number };

/** Categories that compare well side-by-side, in the order we want the tabs. */
const COMPARE_SLUGS = ["ranks", "rank-upgrades", "keys", "kits", "coins", "gems", "shards"];
/** Only ranks are strictly cumulative tiers. */
const INHERIT_SLUGS = new Set(["ranks"]);
/** One-per-account purchases. */
const SINGLE_SLUGS = new Set(["ranks", "rank-upgrades"]);

/** Per-tier accent hues, Oceanias-style (mint → cyan → magenta → gold…). */
const TIER_ACCENTS = [
  { h: "160 100% 50%", name: "mint" },
  { h: "199 100% 55%", name: "cyan" },
  { h: "300 100% 55%", name: "magenta" },
  { h: "45 100% 55%", name: "gold" },
  { h: "265 100% 65%", name: "violet" },
  { h: "10 100% 58%", name: "ember" },
];

const money = (p: number | null, c?: string | null) => {
  if (p == null) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (c || "USD").toUpperCase(),
    }).format(Number(p));
  } catch {
    return `$${Number(p).toFixed(2)}`;
  }
};

const SUBTITLE: Record<string, string> = {
  ranks: "Every rank includes everything from the ranks below it. One-time purchase, never expires.",
  "rank-upgrades": "Jump straight to a higher tier and only pay the difference.",
  keys: "Higher-tier keys roll from richer loot pools.",
  kits: "Instant gear drops — delivered the moment you join.",
  coins: "In-game currency for the market, kits and cosmetics.",
  gems: "Premium currency for the exclusive cosmetic shop.",
  shards: "Craft and reroll cosmetics.",
};

/** Side-by-side "what you get" grid for every comparable store category. */
const StoreComparison = () => {
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState<string>("");
  const cart = useCart();

  useEffect(() => {
    (async () => {
      const { data: catData } = await supabase
        .from("store_categories")
        .select("id, slug, name, sort_order")
        .eq("published", true)
        .in("slug", COMPARE_SLUGS);
      const ordered = ((catData as Category[]) ?? []).sort(
        (a, b) => COMPARE_SLUGS.indexOf(a.slug) - COMPARE_SLUGS.indexOf(b.slug),
      );
      if (ordered.length === 0) return;
      const { data } = await supabase
        .from("store_items")
        .select("id, name, price, currency, perks, sort_order, category_id")
        .in(
          "category_id",
          ordered.map((c) => c.id),
        )
        .eq("published", true)
        .order("sort_order", { ascending: true });
      const rows = ((data as Item[]) ?? []).filter((i) => (i.perks ?? []).length > 0);
      const usable = ordered.filter(
        (c) => rows.filter((i) => i.category_id === c.id).length >= 2,
      );
      setCats(usable);
      setItems(rows);
      setActive((prev) => prev || usable[0]?.slug || "");
    })();
  }, []);

  const cat = cats.find((c) => c.slug === active) ?? cats[0];

  const tiers = useMemo(() => {
    if (!cat) return [] as Item[];
    return items
      .filter((i) => i.category_id === cat.id)
      .sort((a, b) => a.sort_order - b.sort_order || Number(a.price) - Number(b.price));
  }, [items, cat]);

  const inherits = cat ? INHERIT_SLUGS.has(cat.slug) : false;

  const allPerks = useMemo(() => {
    const seen: string[] = [];
    const rollup = /^everything in /i;
    for (const t of tiers)
      for (const p of t.perks ?? []) if (!rollup.test(p) && !seen.includes(p)) seen.push(p);
    return seen;
  }, [tiers]);

  const has = (tier: Item, perk: string) => {
    if (!inherits) return (tier.perks ?? []).includes(perk);
    const idx = tiers.findIndex((t) => t.id === tier.id);
    for (let i = 0; i <= idx; i++) if ((tiers[i].perks ?? []).includes(perk)) return true;
    return false;
  };

  if (!cat || tiers.length < 2) return null;

  const accentFor = (i: number) => TIER_ACCENTS[i % TIER_ACCENTS.length].h;

  return (
    <section id="compare" className="scroll-mt-24">
      <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
        <div>
          <div className="text-[10px] font-mono tracking-widest uppercase text-primary mb-2">
            Compare
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold">
            What each {cat.name.replace(/s$/i, "").toLowerCase()} gets you
          </h2>
        </div>
        <p className="text-sm text-muted-foreground max-w-sm">
          {SUBTITLE[cat.slug] ?? "Side-by-side breakdown of what's included."}
        </p>
      </div>

      {cats.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {cats.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActive(c.slug)}
              className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-widest border transition ${
                c.slug === cat.slug
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm border-separate border-spacing-y-1">
          <thead>
            <tr>
              <th className="w-[34%]" />
              {tiers.map((r, i) => {
                const accent = accentFor(i);
                return (
                  <th key={r.id} className="px-2 pb-4 text-center align-bottom">
                    <div className="flex flex-col items-center gap-2">
                      <Link
                        to={`/store/package/${r.id}`}
                        className="font-mono font-bold text-sm uppercase tracking-[0.25em] hover:opacity-80 transition"
                        style={{ color: `hsl(${accent})` }}
                      >
                        {r.name.replace(/\s*Rank$/i, "")}
                      </Link>
                      <button
                        type="button"
                        onClick={() =>
                          cart.add({
                            id: r.id,
                            name: r.name,
                            price: Number(r.price ?? 0),
                            currency: r.currency ?? "USD",
                            image_url: null,
                            external_url: null,
                            maxQuantity: SINGLE_SLUGS.has(cat.slug) ? 1 : undefined,
                          })
                        }
                        className="font-mono font-bold text-xs uppercase tracking-widest px-5 py-2 border-2 transition hover:brightness-110"
                        style={{
                          backgroundColor: `hsl(${accent})`,
                          borderColor: "hsl(0 0% 100% / 0.85)",
                          color: "hsl(0 0% 100%)",
                          textShadow: "0 1px 0 hsl(0 0% 0% / 0.4)",
                          boxShadow: `0 0 16px hsl(${accent} / 0.45)`,
                        }}
                      >
                        {money(r.price, r.currency)} – Add
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {allPerks.map((perk, i) => (
              <tr key={perk}>
                <td
                  className={`p-3 px-4 font-medium ${i % 2 === 0 ? "bg-secondary/40" : "bg-transparent"}`}
                >
                  {perk}
                </td>
                {tiers.map((r) => (
                  <td
                    key={r.id}
                    className={`p-3 text-center ${i % 2 === 0 ? "bg-secondary/40" : "bg-transparent"}`}
                  >
                    {has(r, perk) ? (
                      <Check
                        className="h-4 w-4 mx-auto"
                        style={{ color: "hsl(145 80% 45%)" }}
                        aria-label="Included"
                      />
                    ) : (
                      <X
                        className="h-4 w-4 mx-auto"
                        style={{ color: "hsl(0 85% 55%)" }}
                        aria-label="Not included"
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default StoreComparison;
