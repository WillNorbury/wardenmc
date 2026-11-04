import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Crown, Loader2, ShoppingCart, Sparkles } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { SEO } from "@/components/site/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useCart, formatMoney } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";
import { rankCartItem, RANK_PRODUCTS, storeAccess } from "@/lib/store-ranks";
import crowns from "@/assets/store-rank-crowns.jpg";
import { toast } from "sonner";

function StoreCatalog() {
  const cart = useCart();
  const [prefix, setPrefix] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [ratesDate, setRatesDate] = useState("");
  const [ratesFailed, setRatesFailed] = useState(false);
  const { data: products, isLoading, error, refetch } = useQuery({
    queryKey: ["store-ranks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_items").select("id,name,description,price,currency,perks")
        .in("id", RANK_PRODUCTS.map(p => p.id)).eq("published", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    const controller = new AbortController();
    fetch("https://open.er-api.com/v6/latest/USD", { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error("Rates unavailable"); return r.json(); })
      .then(data => {
        if (data.result !== "success" || !data.rates) throw new Error("Rates unavailable");
        const clean = Object.fromEntries(Object.entries(data.rates).filter(([code, value]) => /^[A-Z]{3}$/.test(code) && typeof value === "number" && value > 0)) as Record<string, number>;
        setRates({ ...clean, USD: 1 });
        setRatesDate(new Date(data.time_last_update_unix * 1000).toLocaleDateString());
      }).catch(e => { if (e.name !== "AbortError") setRatesFailed(true); });
    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title="Store — Warden Network" description="VIP and custom ranks for Warden Network members." path="/store" noindex />
      <Navbar />
      <main className="flex-1 pt-28 pb-16">
        <div className="container max-w-5xl">
          <div className="relative overflow-hidden border-b border-border min-h-64 sm:min-h-80">
            <img src={crowns} alt="Diamond and emerald voxel rank crowns" width={1536} height={768} className="absolute inset-0 h-full w-full object-cover" />
            <div className="relative flex min-h-64 flex-col justify-between p-5 sm:min-h-80 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <h1 className="font-display text-4xl sm:text-5xl text-primary-foreground bg-background/90 px-3 py-2">WARDEN STORE</h1>
                <Button asChild variant="secondary" className="shrink-0"><Link to="/cart"><ShoppingCart className="mr-2 h-4 w-4" />Cart ({cart.count})</Link></Button>
              </div>
              <p className="w-fit bg-background/90 px-3 py-2 text-sm text-foreground">VIP & custom ranks</p>
            </div>
          </div>
          <div className="my-6 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-2xl">Choose your rank</h2>
            <div className="w-44 space-y-1.5">
              <Label htmlFor="store-currency">Display currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="store-currency"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.keys(rates).sort().map(code => <SelectItem key={code} value={code}>{code}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {isLoading && <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
          {error && <div role="alert" className="py-10 text-center"><p>Ranks could not be loaded.</p><Button onClick={() => refetch()} variant="outline" className="mt-3">Try again</Button></div>}
          {products?.length === 0 && <p className="py-10 text-muted-foreground">Ranks are currently unavailable.</p>}
          <div className="grid gap-5 md:grid-cols-2">
            {products?.map(product => {
              const custom = product.id === RANK_PRODUCTS[1].id;
              const Icon = custom ? Sparkles : Crown;
              return (
                <Card key={product.id} className="flex flex-col p-6">
                  <div className="flex items-center gap-3"><Icon className="h-8 w-8 text-primary" /><h3 className="font-display text-3xl">{product.name}</h3></div>
                  <p className="mt-3 text-muted-foreground">{product.description}</p>
                  <div className="mt-5 text-3xl font-semibold tabular-nums">{currency !== "USD" && "≈ "}{formatMoney(Number(product.price) * (rates[currency] ?? 1), currency)}</div>
                  {currency !== "USD" && <p className="mt-1 text-sm text-muted-foreground">Base price: {formatMoney(Number(product.price), "USD")}</p>}
                  {product.perks.length > 0 && <ul className="mt-4 list-disc pl-5 text-sm text-muted-foreground">{product.perks.map(perk => <li key={perk}>{perk}</li>)}</ul>}
                  <div className="mt-6 flex-1">
                    {custom ? <div className="space-y-3">
                      <Label htmlFor="rank-prefix">Rank prefix</Label>
                      <Input id="rank-prefix" value={prefix} onChange={e => setPrefix(e.target.value)} placeholder="[Your rank]" />
                      <div className="min-h-14 break-words border border-border bg-muted p-3 font-mono text-sm"><span className="text-primary">{prefix.trim() || "[Your rank]"}</span> <span className="text-muted-foreground">Player: Hello!</span></div>
                    </div> : <div className="min-h-14 border border-border bg-muted p-3 font-mono text-sm"><span className="text-primary">[VIP]</span> <span className="text-muted-foreground">Player: Hello!</span></div>}
                  </div>
                  <Button className="mt-6 w-full" disabled={custom && !prefix.trim()} onClick={() => {
                    try { cart.add(rankCartItem(product, custom ? prefix : undefined)); toast.success(`${product.name} added to cart`); }
                    catch (e) { toast.error((e as Error).message); }
                  }}><ShoppingCart className="mr-2 h-4 w-4" />Add {product.name} to cart</Button>
                </Card>
              );
            })}
          </div>
          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            <p>Orders are priced in USD. Staff confirm payment and rank details through your private order ticket.</p>
            {ratesDate && <p>Currency estimates: <a className="underline" href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">ExchangeRate-API</a> · updated {ratesDate}. Your payment provider’s rate may differ.</p>}
            {ratesFailed && <p>Currency estimates are unavailable right now. Prices are shown in USD.</p>}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function Store() {
  const { user, loading } = useAuth();
  const access = storeAccess(loading, Boolean(user));
  if (access === "loading") return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading store" /></div>;
  if (access === "sign-in") return <Navigate to="/auth?next=/store" replace />;
  return <StoreCatalog />;
}