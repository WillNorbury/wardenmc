import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SaleBanner from "@/components/site/SaleBanner";
import MembershipTiersSection from "@/components/site/MembershipTiersSection";
import StickyCartBar from "@/components/site/StickyCartBar";
import RankComparison from "@/components/site/RankComparison";

import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { useCart, formatMoney } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Zap,
  Package,
  Coins,
  Award,
  Flame,
  Star,
  
  Plus,
  Minus,
  Trash2,
  Check,
  AlertCircle,
} from "lucide-react";
import { getRecentlyViewedIds, clearRecentlyViewed } from "@/lib/recentlyViewed";

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
};

type Item = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  badge: string | null;
  featured: boolean;
  external_url: string | null;
  sort_order: number;
};

const ICONS: Record<string, any> = {
  Sparkles,
  Zap,
  Package,
  Coins,
  Award,
  Flame,
  Star,
  ShoppingBag,
};

const iconFor = (name?: string | null) => ICONS[name ?? ""] ?? Package;

const formatPrice = (p: number | null | undefined, c?: string | null) => {
  if (p == null) return "";
  const cur = (c || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(Number(p));
  } catch {
    return `${cur} ${Number(p).toFixed(2)}`;
  }
};

export default function Store() {
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const cart = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const cartRef = useRef<HTMLElement | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>(() => getRecentlyViewedIds());
  const [popularIds, setPopularIds] = useState<string[]>([]);

  useEffect(() => {
    supabase.rpc("get_popular_store_items", { _limit: 6 }).then(({ data }) => {
      if (Array.isArray(data)) setPopularIds(data.map((r: any) => r.item_id).filter(Boolean));
    });
  }, []);

  useEffect(() => {
    const sync = () => setRecentIds(getRecentlyViewedIds());
    window.addEventListener("recently-viewed:changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("recently-viewed:changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const scrollToCart = () => {
    const el = cartRef.current ?? document.getElementById("cart");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      // Fallback: retry once after items load
      window.setTimeout(() => {
        const retry = document.getElementById("cart");
        if (retry) retry.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  };

  useEffect(() => {
    supabase
      .from("store_categories")
      .select("id, slug, name, description, icon, sort_order")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setCats((data as Category[]) ?? []));
    supabase
      .from("store_items")
      .select(
        "id, category_id, name, description, price, currency, image_url, badge, featured, external_url, sort_order",
      )
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setItems((data as Item[]) ?? []));
  }, []);

  // Scroll to #cart or #compare when hash is present (also after items load so section exists).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const scrollToHash = () => {
      const hash = window.location.hash;
      if (hash === "#cart") {
        scrollToCart();
      } else if (hash === "#compare") {
        const el = document.getElementById("compare");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    };
    scrollToHash();
    // The compare section loads async via its own fetch, so retry a few times.
    const t1 = window.setTimeout(scrollToHash, 300);
    const t2 = window.setTimeout(scrollToHash, 800);
    window.addEventListener("hashchange", scrollToHash);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("hashchange", scrollToHash);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((it) => {
      if (activeCat !== "all" && it.category_id !== activeCat) return false;
      if (!needle) return true;
      return (
        it.name.toLowerCase().includes(needle) ||
        (it.description ?? "").toLowerCase().includes(needle)
      );
    });
  }, [items, q, activeCat]);

  const featured = filtered.filter((i) => i.featured);
  const rest = filtered.filter((i) => !i.featured);
  const heroItem = featured[0] ?? rest[0];
  const sideFeatured = (heroItem ? featured.filter((i) => i.id !== heroItem.id) : featured).slice(
    0,
    2,
  );

  const restByCat = useMemo(() => {
    const g: Record<string, Item[]> = {};
    for (const it of rest) {
      if (heroItem && it.id === heroItem.id) continue;
      (g[it.category_id] ||= []).push(it);
    }
    return g;
  }, [rest, heroItem]);

  const recentItems = useMemo(() => {
    if (recentIds.length === 0) return [] as Item[];
    const byId = new Map(items.map((i) => [i.id, i]));
    return recentIds.map((id) => byId.get(id)).filter(Boolean) as Item[];
  }, [recentIds, items]);

  const popularItems = useMemo(() => {
    if (popularIds.length === 0) return [] as Item[];
    const byId = new Map(items.map((i) => [i.id, i]));
    return popularIds.map((id) => byId.get(id)).filter(Boolean) as Item[];
  }, [popularIds, items]);


  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? "More";

  const ItemLink = ({
    it,
    children,
    className,
  }: {
    it: Item;
    children: React.ReactNode;
    className?: string;
  }) => (
    <Link to={`/store/package/${it.id}`} className={className}>
      {children}
    </Link>
  );

  const RANK_SLUGS = new Set(["ranks", "rank-upgrades"]);
  const isRankLike = (categoryId: string) =>
    RANK_SLUGS.has(cats.find((c) => c.id === categoryId)?.slug ?? "");

  const handleAdd = (it: Item) => {
    cart.add({
      id: it.id,
      name: it.name,
      price: it.price,
      currency: it.currency,
      image_url: it.image_url,
      external_url: it.external_url,
      maxQuantity: isRankLike(it.category_id) ? 1 : undefined,
    });
    setJustAdded(it.id);
    window.setTimeout(() => {
      setJustAdded((cur) => (cur === it.id ? null : cur));
    }, 1400);
  };

  const handleCheckout = async () => {
    if (cart.items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }
    if (!user) {
      toast.message("Sign in to checkout — we'll open a support ticket with your order.");
      nav("/auth?next=/store%23cart");
      return;
    }
    setCheckingOut(true);
    const lines = cart.items.map(
      (ci) =>
        `• ${ci.name} × ${ci.quantity} — ${formatMoney(
          (Number(ci.price) || 0) * ci.quantity,
          (ci.currency || cart.currency || "USD").toUpperCase(),
        )}`,
    );
    const subject = `Store order — ${cart.count} item${cart.count === 1 ? "" : "s"} (${formatMoney(
      cart.subtotal,
      cart.currency,
    )})`;
    const body = [
      "New store checkout submitted via the website.",
      "",
      "Items:",
      ...lines,
      "",
      `Subtotal: ${formatMoney(cart.subtotal, cart.currency)}`,
      "",
      "Staff: please reply with payment instructions or fulfillment status.",
    ].join("\n");

    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        subject,
        body,
        category: "Store & Payments",
        priority: "normal",
        user_id: user.id,
      })
      .select("id")
      .single();
    setCheckingOut(false);
    if (error) {
      toast.error(error.message || "Could not create ticket.");
      return;
    }
    cart.clear();
    toast.success("Order sent — a support ticket has been created.");
    nav(`/tickets?ticket=${data.id}`);
  };


  const AddToCartButton = ({
    it,
    size = "sm",
  }: {
    it: Item;
    size?: "sm" | "lg";
  }) => {
    const added = justAdded === it.id;
    const base =
      size === "lg"
        ? "px-5 py-2.5 text-xs"
        : "px-3 py-1.5 text-[11px]";
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleAdd(it);
        }}
        className={`${base} font-mono tracking-widest uppercase inline-flex items-center gap-2 border transition ${
          added
            ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-300"
            : "bg-primary border-primary text-primary-foreground hover:bg-primary/90"
        }`}
        aria-label={`Add ${it.name} to cart`}
      >
        {added ? (
          <>
            <Check className="w-3.5 h-3.5" /> Added
          </>
        ) : (
          <>
            <ShoppingCart className="w-3.5 h-3.5" /> Add
          </>
        )}
      </button>
    );
  };

  const CouponInput = () => {
    const [code, setCode] = useState("");
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={async (e) => {
            if (e.key === "Enter") {
              const ok = await cart.applyCoupon(code);
              if (ok) {
                setCode("");
                toast.success("Coupon applied");
              }
            }
          }}
          placeholder="COUPON CODE"
          className="bg-muted border border-border focus:border-primary focus:outline-none px-3 py-2 text-xs font-mono tracking-widest uppercase text-foreground placeholder:text-muted-foreground w-48"
        />
        <button
          type="button"
          onClick={async () => {
            const ok = await cart.applyCoupon(code);
            if (ok) {
              setCode("");
              toast.success("Coupon applied");
            }
          }}
          disabled={cart.applyingCoupon || !code.trim()}
          className="px-4 py-2 text-[10px] font-mono tracking-widest uppercase border border-border text-muted-foreground hover:border-primary hover:text-primary transition disabled:opacity-50"
        >
          {cart.applyingCoupon ? "…" : "Apply"}
        </button>
      </div>
    );
  };

  const CreatorCodeInput = () => {
    const [code, setCode] = useState("");
    const apply = async () => {
      const ok = await cart.applyCreatorCode(code);
      if (ok) {
        setCode("");
        toast.success("Creator code applied");
      }
    };
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply();
          }}
          placeholder="CREATOR CODE"
          className="bg-muted border border-border focus:border-cyan-400 focus:outline-none px-3 py-2 text-xs font-mono tracking-widest uppercase text-foreground placeholder:text-muted-foreground w-48"
        />
        <button
          type="button"
          onClick={apply}
          disabled={cart.applyingCreatorCode || !code.trim()}
          className="px-4 py-2 text-[10px] font-mono tracking-widest uppercase border border-border text-muted-foreground hover:border-cyan-400 hover:text-cyan-300 transition disabled:opacity-50"
        >
          {cart.applyingCreatorCode ? "…" : "Apply"}
        </button>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="absolute inset-0 bg-grid opacity-[0.35]" />
        <div className="absolute inset-x-0 top-0 h-72 opacity-[0.12]" style={{ background: "var(--gradient-fire)" }} />
      </div>
      <Helmet>
        <title>Store — Warden Network</title>
        <meta
          name="description"
          content="Warden Network store: ranks, cosmetics, boosters, bundles, and in-game coins."
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;500;700&display=swap"
          rel="stylesheet"
        />
      </Helmet>
      <Navbar />
      <main className="flex-1 w-full">
        <div className="max-w-6xl w-full mx-auto px-4 md:px-8 py-10 md:py-14 flex flex-col gap-12">
          {/* Header & Search */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-8">
            <div className="space-y-2">
              <span className="text-primary font-mono text-sm tracking-widest uppercase">
                Marketplace
              </span>
              <h1 className="text-6xl md:text-8xl font-bold font-display tracking-tighter italic">
                STORE
              </h1>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={scrollToCart}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 border border-primary/60 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-mono tracking-widest uppercase transition relative"
                aria-label={`Open cart (${cart.count} items)`}
              >
                <ShoppingCart className="w-4 h-4" strokeWidth={1.75} />
                Open Cart
                {cart.count > 0 && (
                  <span className="ml-1 min-w-[20px] h-5 px-1.5 grid place-items-center bg-primary text-primary-foreground text-[10px] font-bold leading-none">
                    {cart.count > 99 ? "99+" : cart.count}
                  </span>
                )}
              </button>
              <div className="relative group max-w-md w-full">
                <div className="absolute -inset-0.5 bg-primary opacity-20 blur-sm group-focus-within:opacity-40 transition pointer-events-none" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search the store..."
                  className="relative w-full bg-muted border border-border px-6 py-4 rounded-none focus:outline-none focus:border-primary text-lg font-display tracking-wide text-foreground placeholder:text-muted-foreground"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary font-mono text-xs opacity-50 hidden sm:block">
                  [/]
                </div>
              </div>
            </div>
          </div>


          <SaleBanner />

          <MembershipTiersSection className="pt-2" />

          {/* Category tabs */}
          {cats.length > 0 && (
            <div className="flex flex-wrap gap-2 -mt-4">
              <button
                onClick={() => setActiveCat("all")}
                className={`px-4 py-2 text-xs font-mono tracking-widest uppercase border transition ${
                  activeCat === "all"
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                All
              </button>
              {cats.map((c) => {
                const Icon = iconFor(c.icon);
                return (
                  <Link
                    key={c.id}
                    to={`/store/category/${c.slug}`}
                    className={`px-4 py-2 text-xs font-mono tracking-widest uppercase border transition inline-flex items-center gap-2 ${
                      activeCat === c.id
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                    {c.name}
                  </Link>
                );
              })}
            </div>
          )}

          {popularItems.length > 0 && (
            <section className="mb-10 border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                <h2 className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
                  Popular — most wishlisted
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {popularItems.map((it, idx) => (
                  <div
                    key={it.id}
                    className="group relative bg-background border border-border hover:border-primary/40 transition overflow-hidden"
                  >
                    <Link to={`/store/package/${it.id}`} className="block">
                      <span className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 tracking-widest">
                        #{idx + 1}
                      </span>
                      <div className="aspect-square bg-muted relative overflow-hidden">
                        {it.image_url ? (
                          <img
                            src={it.image_url}
                            alt={it.name}
                            loading="lazy"
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-primary/30">
                            <Package className="w-8 h-8" strokeWidth={1.5} />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <div className="text-xs font-semibold truncate group-hover:text-primary transition">
                          {it.name}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                          {formatPrice(it.price, it.currency)}
                        </div>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAdd(it);
                      }}
                      aria-label={`Quick add ${it.name} to cart`}
                      title="Quick add to cart"
                      className={`absolute top-2 right-2 z-10 w-7 h-7 grid place-items-center border transition ${
                        justAdded === it.id
                          ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-300"
                          : "bg-background/80 border-border text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-primary hover:border-primary hover:text-primary-foreground"
                      }`}
                    >
                      {justAdded === it.id ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}



          {recentItems.length > 0 && (
            <section className="mb-10 border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
                  Recently viewed
                </h2>
                <button
                  type="button"
                  onClick={clearRecentlyViewed}
                  className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground hover:text-primary transition"
                >
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {recentItems.map((it) => (
                  <div
                    key={it.id}
                    className="group relative bg-background border border-border hover:border-primary/40 transition overflow-hidden"
                  >
                    <Link to={`/store/package/${it.id}`} className="block">
                      <div className="aspect-square bg-muted relative overflow-hidden">
                        {it.image_url ? (
                          <img
                            src={it.image_url}
                            alt={it.name}
                            loading="lazy"
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-primary/30">
                            <Package className="w-8 h-8" strokeWidth={1.5} />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <div className="text-xs font-semibold truncate group-hover:text-primary transition">
                          {it.name}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                          {formatPrice(it.price, it.currency)}
                        </div>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAdd(it);
                      }}
                      aria-label={`Quick add ${it.name} to cart`}
                      title="Quick add to cart"
                      className={`absolute top-2 right-2 z-10 w-7 h-7 grid place-items-center border transition ${
                        justAdded === it.id
                          ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-300"
                          : "bg-background/80 border-border text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-primary hover:border-primary hover:text-primary-foreground"
                      }`}
                    >
                      {justAdded === it.id ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}



          {filtered.length === 0 ? (
            <p className="text-muted-foreground">
              {items.length === 0 ? "The store is empty." : "No items match your search."}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Featured hero */}
              {heroItem && (
                <ItemLink
                  it={heroItem}
                  className="md:col-span-8 group relative bg-muted overflow-hidden min-h-[320px] md:min-h-[380px] flex flex-col justify-end p-8 border border-border hover:border-primary/40 transition-colors"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
                  {heroItem.image_url ? (
                    <img
                      src={heroItem.image_url}
                      alt={heroItem.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover opacity-40 z-0"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 opacity-30 z-0"
                      style={{
                        background:
                          "radial-gradient(circle at 20% 30%, rgba(255,87,34,0.35), transparent 55%)",
                      }}
                    />
                  )}
                  <div className="absolute top-0 right-0 p-4 z-20">
                    <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 tracking-widest uppercase">
                      {heroItem.badge || catName(heroItem.category_id)}
                    </span>
                  </div>
                  <div className="relative z-20 space-y-4">
                    <h2 className="text-4xl md:text-5xl font-bold font-display leading-none group-hover:text-primary transition-colors">
                      {heroItem.name}
                    </h2>
                    {heroItem.description && (
                      <p className="text-muted-foreground max-w-md line-clamp-2">
                        {heroItem.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-primary uppercase tracking-widest">
                      <span className="text-2xl md:text-3xl font-bold font-display not-italic normal-case tracking-normal text-primary-foreground">
                        {formatPrice(heroItem.price, heroItem.currency)}
                      </span>
                      <AddToCartButton it={heroItem} size="lg" />
                    </div>
                  </div>
                </ItemLink>
              )}

              {/* Side featured */}
              {sideFeatured.length > 0 && (
                <div className="md:col-span-4 flex flex-col gap-6">
                  {sideFeatured.map((it, i) => (
                    <ItemLink
                      key={it.id}
                      it={it}
                      className={`bg-muted p-6 border-l-4 flex flex-col justify-between min-h-[180px] hover:bg-accent transition-all group ${
                        i === 0
                          ? "border-primary"
                          : "border-border hover:border-primary"
                      }`}
                    >
                      <div>
                        <h3 className="text-xl font-bold font-display group-hover:text-primary transition-colors">
                          {it.name}
                        </h3>
                        {it.description && (
                          <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                            {it.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-4 gap-3">
                        <span className="text-lg font-bold font-display">
                          {formatPrice(it.price, it.currency)}
                        </span>
                        <AddToCartButton it={it} />
                      </div>
                    </ItemLink>
                  ))}
                </div>
              )}

              {/* Sections by category */}
              {Object.entries(restByCat).map(([catId, arr]) => {
                const cat = cats.find((c) => c.id === catId);
                const Icon = iconFor(cat?.icon);
                return (
                  <div key={catId} className="md:col-span-12 mt-4">
                    <div className="flex items-center gap-4 mb-6">
                      <Icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
                      <Link
                        to={`/store/category/${cat?.slug ?? ""}`}
                        className="text-sm font-mono text-primary uppercase tracking-[0.3em] hover:underline"
                      >
                        {catName(catId)}
                      </Link>
                      <div className="flex-1 h-px bg-white/5" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {arr.map((it) => (
                        <ItemLink
                          key={it.id}
                          it={it}
                          className="p-6 bg-muted border border-border hover:border-primary/30 transition group flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-bold font-display group-hover:text-primary transition-colors">
                                {it.name}
                              </h4>
                              {it.badge && (
                                <span className="text-[9px] font-mono tracking-widest uppercase bg-primary/10 text-primary px-1.5 py-0.5 border border-primary/30">
                                  {it.badge}
                                </span>
                              )}
                            </div>
                            {it.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {it.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border gap-3">
                            <span className="font-bold font-display">
                              {formatPrice(it.price, it.currency)}
                            </span>
                            <AddToCartButton it={it} />
                          </div>
                        </ItemLink>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Rank comparison */}
              <div className="md:col-span-12 mt-10">
                <RankComparison />
              </div>

              {/* Cart summary */}

              <section
                id="cart"
                ref={cartRef}
                className="md:col-span-12 mt-8 scroll-mt-24 bg-card border border-border"
              >
                <div className="flex items-center gap-4 px-6 py-4 border-b border-border">
                  <ShoppingCart className="w-4 h-4 text-primary" strokeWidth={1.75} />
                  <h2 className="text-sm font-mono text-primary uppercase tracking-[0.3em]">
                    Your Cart
                  </h2>
                  <span className="text-xs font-mono text-muted-foreground tracking-widest">
                    {cart.count} {cart.count === 1 ? "ITEM" : "ITEMS"}
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                  {cart.items.length > 0 && (
                    <button
                      onClick={() => cart.clear()}
                      className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-primary transition inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>

                {cart.items.length === 0 ? (
                  <div className="px-6 py-10 text-center text-muted-foreground font-mono text-xs tracking-widest uppercase">
                    Your cart is empty — pick something above.
                  </div>
                ) : (
                  <>
                    <ul className="divide-y divide-white/5">
                      {cart.items.map((ci) => (
                        <li
                          key={ci.id}
                          className="flex items-center gap-4 px-6 py-4"
                        >
                          <div className="w-12 h-12 shrink-0 bg-muted border border-border overflow-hidden flex items-center justify-center">
                            {ci.image_url ? (
                              <img
                                src={ci.image_url}
                                alt={ci.name}
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-primary" strokeWidth={1.5} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold font-display truncate">
                              {ci.name}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {formatPrice(ci.price, ci.currency)} each
                            </div>
                          </div>
                          <div className="inline-flex items-center border border-border">
                            <button
                              type="button"
                              aria-label={`Decrease ${ci.name}`}
                              onClick={() => cart.setQty(ci.id, ci.quantity - 1)}
                              className="w-8 h-8 grid place-items-center text-muted-foreground hover:text-primary hover:bg-white/5"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-10 text-center font-mono text-sm tabular-nums">
                              {ci.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label={`Increase ${ci.name}`}
                              onClick={() => cart.setQty(ci.id, ci.quantity + 1)}
                              className="w-8 h-8 grid place-items-center text-muted-foreground hover:text-primary hover:bg-white/5"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="w-24 text-right font-bold font-display tabular-nums">
                            {formatMoney(
                              (Number(ci.price) || 0) * ci.quantity,
                              (ci.currency || "USD").toUpperCase(),
                            )}
                          </div>
                          <button
                            type="button"
                            aria-label={`Remove ${ci.name}`}
                            onClick={() => cart.remove(ci.id)}
                            className="text-muted-foreground hover:text-primary transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-col gap-4 px-6 py-5 border-t border-border bg-card">
                      {/* Coupon row */}
                      <div className="flex flex-col md:flex-row md:items-center gap-3">
                        {cart.coupon ? (
                          <div className="flex items-center gap-3 border border-primary/50 bg-primary/5 px-3 py-2">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-primary">
                              Coupon
                            </span>
                            <span className="font-mono font-bold text-sm">{cart.coupon.code}</span>
                            <span className="text-xs text-muted-foreground">
                              {cart.coupon.discount_type === "percent"
                                ? `${cart.coupon.discount_value}% off`
                                : `${formatMoney(cart.coupon.discount_value, cart.currency)} off`}
                            </span>
                            <button
                              type="button"
                              onClick={cart.clearCoupon}
                              className="ml-2 text-muted-foreground hover:text-primary"
                              aria-label="Remove coupon"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <CouponInput />
                        )}
                        {cart.couponError && (
                          <div
                            role="alert"
                            className="inline-flex items-center gap-2 text-xs font-mono text-red-300 bg-red-500/10 border border-red-500/40 px-2.5 py-1.5"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            {cart.couponError}
                          </div>
                        )}
                      </div>

                      {/* Creator code row */}
                      <div className="flex flex-col md:flex-row md:items-center gap-3">
                        {cart.creatorCode ? (
                          <div className="flex items-center gap-3 border border-cyan-400/50 bg-cyan-500/5 px-3 py-2">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-300">
                              Creator
                            </span>
                            <span className="font-mono font-bold text-sm">{cart.creatorCode.code}</span>
                            <span className="text-xs text-muted-foreground">
                              {cart.creatorCode.discount_percent}% off · supporting {cart.creatorCode.creator_name}
                            </span>
                            <button
                              type="button"
                              onClick={cart.clearCreatorCode}
                              className="ml-2 text-muted-foreground hover:text-cyan-300"
                              aria-label="Remove creator code"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <CreatorCodeInput />
                        )}
                        {cart.creatorCodeError && (
                          <div
                            role="alert"
                            className="inline-flex items-center gap-2 text-xs font-mono text-red-300 bg-red-500/10 border border-red-500/40 px-2.5 py-1.5"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            {cart.creatorCodeError}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground w-24">
                              Subtotal
                            </span>
                            <span className="tabular-nums font-mono">
                              {formatMoney(cart.subtotal, cart.currency)}
                            </span>
                          </div>
                          {cart.storeSaleDiscount > 0 && (
                            <div className="flex items-center gap-3 text-primary">
                              <span className="text-xs font-mono uppercase tracking-widest w-24">
                                Sale {cart.storeSalePercent}%
                              </span>
                              <span className="tabular-nums font-mono">
                                −{formatMoney(cart.storeSaleDiscount, cart.currency)}
                              </span>
                            </div>
                          )}
                          {cart.discount > 0 && (
                            <div className="flex items-center gap-3 text-primary">
                              <span className="text-xs font-mono uppercase tracking-widest w-24">
                                Discount
                              </span>
                              <span className="tabular-nums font-mono">
                                −{formatMoney(cart.discount, cart.currency)}
                              </span>
                            </div>
                          )}
                          {cart.creatorDiscount > 0 && cart.creatorCode && (
                            <div className="flex items-center gap-3 text-cyan-300">
                              <span className="text-xs font-mono uppercase tracking-widest w-24">
                                Creator {cart.creatorCode.discount_percent}%
                              </span>
                              <span className="tabular-nums font-mono">
                                −{formatMoney(cart.creatorDiscount, cart.currency)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground w-24">
                              Total
                            </span>
                            <span className="text-2xl font-bold font-display tabular-nums">
                              {formatMoney(cart.total, cart.currency)}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => nav("/checkout")}
                          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-mono tracking-widest uppercase transition"
                        >
                          Checkout
                          <ShoppingCart className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </section>


              {/* Footer strip */}
              <div className="md:col-span-12 flex flex-col md:flex-row gap-4 items-center justify-between mt-6 pt-6 border-t border-border">
                <div className="flex flex-wrap gap-6 md:gap-8">
                  <Link
                    to="/support"
                    className="text-xs font-mono text-muted-foreground hover:text-primary tracking-widest transition"
                  >
                    SUPPORT
                  </Link>
                  <Link
                    to="/wiki"
                    className="text-xs font-mono text-muted-foreground hover:text-primary tracking-widest transition"
                  >
                    WIKI
                  </Link>
                  <Link
                    to="/changelog"
                    className="text-xs font-mono text-muted-foreground hover:text-primary tracking-widest transition"
                  >
                    CHANGELOG
                  </Link>
                  <a
                    href="#cart"
                    className="text-xs font-mono text-muted-foreground hover:text-primary tracking-widest transition"
                  >
                    CART ({cart.count})
                  </a>
                  <Link
                    to="/wiki/ranks-carnage"
                    className="text-xs font-mono text-primary hover:text-primary-foreground tracking-widest transition"
                  >
                    RANK PERKS
                  </Link>
                </div>
                <div className="text-[10px] text-primary-foreground/20 font-mono flex items-center gap-2">
                  <ShoppingBag className="w-3 h-3" /> WARDEN NETWORK MARKETPLACE
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <StickyCartBar />
    </div>
  );
}
