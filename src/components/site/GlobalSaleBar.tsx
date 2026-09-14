import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchStoreSale, isStoreSaleLive, type StoreSale } from "@/lib/storeSale";

type Coupon = {
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  currency: string | null;
  expires_at: string | null;
};

const useCountdown = (target: string | null) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);

  return useMemo(() => {
    if (!target) return null;
    const diff = new Date(target).getTime() - now;
    if (!Number.isFinite(diff) || diff <= 0) return null;
    const s = Math.floor(diff / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return d > 0 ? `${d}d ${h}h ${pad(m)}m ${pad(sec)}s` : `${h}h ${pad(m)}m ${pad(sec)}s`;
  }, [target, now]);
};

const BAR_CLASS =
  "relative z-50 flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-primary px-4 py-1.5 text-center text-primary-foreground transition hover:brightness-110";

/** Thin site-wide banner shown across the full top of the page (above the sidebar)
 *  whenever a sale/coupon is live. Measures its own height into --sale-bar-h so the
 *  fixed sidebar can sit just below it. */
const GlobalSaleBar = () => {
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [storeSale, setStoreSale] = useState<StoreSale | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data }, sale] = await Promise.all([
        supabase.rpc("list_public_coupons", { _limit: 1 }),
        fetchStoreSale(),
      ]);
      if (cancelled) return;
      setCoupon((((data as unknown as Coupon[]) ?? [])[0] as Coupon) ?? null);
      setStoreSale(isStoreSaleLive(sale) ? sale : null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Push the fixed sidebar + content down by exactly the bar's height (0 when absent).
  useLayoutEffect(() => {
    const el = barRef.current;
    const apply = () => {
      const h = el ? el.getBoundingClientRect().height : 0;
      document.documentElement.style.setProperty("--sale-bar-h", `${h}px`);
    };
    apply();
    if (!el) return;
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.setProperty("--sale-bar-h", "0px");
    };
  }, [storeSale, coupon]);

  const countdown = useCountdown(storeSale?.ends_at ?? coupon?.expires_at ?? null);

  let content: React.ReactNode = null;

  if (storeSale) {
    content = (
      <Link to="/store" className={BAR_CLASS}>
        <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Sale live</span>
        <span className="opacity-60">•</span>
        <span className="text-sm font-semibold">{storeSale.label}</span>
        <span className="text-sm font-bold uppercase tracking-wide">
          {storeSale.percent}% OFF EVERYTHING
        </span>
        <span className="rounded bg-primary-foreground/15 px-2 py-0.5 text-xs font-semibold">
          No code needed
        </span>
        {countdown && (
          <span className="rounded bg-primary-foreground/15 px-2 py-0.5 font-mono text-xs font-semibold">
            Ends in {countdown}
          </span>
        )}
      </Link>
    );
  } else if (coupon) {
    const discountLabel =
      coupon.discount_type === "percent"
        ? `UP TO ${Number(coupon.discount_value)}% OFF`
        : `${(coupon.currency ?? "USD").toUpperCase()} ${Number(coupon.discount_value).toFixed(2)} OFF`;
    content = (
      <Link to="/store" className={BAR_CLASS}>
        <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Sale live</span>
        <span className="opacity-60">•</span>
        <span className="text-sm font-semibold">{coupon.description?.trim() || "Store Sale"}</span>
        <span className="text-sm font-bold uppercase tracking-wide">{discountLabel}</span>
        <span className="rounded bg-primary-foreground/15 px-2 py-0.5 font-mono text-xs font-semibold">
          Code {coupon.code}
        </span>
        {countdown && (
          <span className="rounded bg-primary-foreground/15 px-2 py-0.5 font-mono text-xs font-semibold">
            Ends in {countdown}
          </span>
        )}
      </Link>
    );
  }

  return (
    <div ref={barRef} className="fixed inset-x-0 top-0 z-[60] w-full">
      {content}
    </div>
  );
};

export default GlobalSaleBar;
