import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { SEO } from "@/components/site/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCart, formatMoney } from "@/lib/cart";
import { Minus, Package, Plus, ShoppingCart, Trash2, X, Tag } from "lucide-react";
import { toast } from "sonner";

export function CartTotals() {
  const cart = useCart();
  const row = (label: string, value: number) => (
    <div className="flex justify-between text-primary">
      <span>{label}</span>
      <span className="tabular-nums">−{formatMoney(value, cart.currency)}</span>
    </div>
  );
  return (
    <div className="space-y-1.5 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="tabular-nums">{formatMoney(cart.subtotal, cart.currency)}</span>
      </div>
      {cart.storeSaleDiscount > 0 && row(`${cart.storeSale?.label || "Store sale"} (${cart.storeSalePercent}%)`, cart.storeSaleDiscount)}
      {cart.discount > 0 && row(`Coupon (${cart.coupon?.code})`, cart.discount)}
      {cart.creatorDiscount > 0 && row(`Creator code (${cart.creatorCode?.code})`, cart.creatorDiscount)}
      {cart.bundleDiscount > 0 && row(`Bundle discount (${cart.bundlePercent}%)`, cart.bundleDiscount)}
      <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
        <span>Total</span>
        <span className="tabular-nums">{formatMoney(cart.total, cart.currency)}</span>
      </div>
    </div>
  );
}

const Cart = () => {
  const cart = useCart();
  const nav = useNavigate();
  const [code, setCode] = useState("");

  const apply = async () => {
    if (await cart.applyCoupon(code)) {
      setCode("");
      toast.success("Coupon applied");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Your Cart — WardenMC" description="Review the items in your WardenMC cart." path="/cart" />
      <Navbar />
      <main className="container mx-auto max-w-5xl px-4 pb-16 pt-28">
        <h1 className="mb-6 flex items-center gap-2 font-display text-3xl font-bold">
          <ShoppingCart className="h-7 w-7 text-primary" /> Your cart
          <span className="text-base font-normal text-muted-foreground">({cart.count} {cart.count === 1 ? "item" : "items"})</span>
        </h1>

        {cart.items.length === 0 ? (
          <Card className="p-10 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Button asChild variant="outline" className="mt-4"><Link to="/">Back to home</Link></Button>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <Card className="divide-y divide-border">
              {cart.items.map((ci) => (
                <div key={ci.id} className="flex items-center gap-4 p-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded bg-muted">
                    {ci.image_url ? <img src={ci.image_url} alt={ci.name} className="h-full w-full object-cover" /> : <Package className="h-6 w-6 text-primary" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{ci.name}</div>
                    <div className="text-xs text-muted-foreground">{formatMoney(Number(ci.price) || 0, (ci.currency || "USD").toUpperCase())} each</div>
                    {ci.recipient && <div className="text-xs text-muted-foreground">Gift to {ci.recipient}</div>}
                    <div className="mt-2 inline-flex items-center rounded border border-border">
                      <button type="button" aria-label="Decrease" onClick={() => cart.setQty(ci.id, ci.quantity - 1)} className="grid h-8 w-8 place-items-center hover:bg-muted"><Minus className="h-3 w-3" /></button>
                      <span className="w-8 text-center font-mono text-sm tabular-nums">{ci.quantity}</span>
                      <button type="button" aria-label="Increase" onClick={() => cart.setQty(ci.id, ci.quantity + 1)} className="grid h-8 w-8 place-items-center hover:bg-muted"><Plus className="h-3 w-3" /></button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-semibold tabular-nums">{formatMoney((Number(ci.price) || 0) * ci.quantity, (ci.currency || "USD").toUpperCase())}</span>
                    <button type="button" aria-label={`Remove ${ci.name}`} onClick={() => cart.remove(ci.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </Card>

            <Card className="h-fit space-y-4 p-5">
              {cart.coupon ? (
                <div className="flex items-center justify-between rounded border border-primary/40 bg-primary/5 p-2 text-sm">
                  <span className="font-mono font-semibold">{cart.coupon.code}</span>
                  <button type="button" aria-label="Remove coupon" onClick={cart.clearCoupon}><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && apply()} placeholder="Coupon code" className="pl-7 font-mono uppercase" />
                  </div>
                  <Button variant="outline" onClick={apply} disabled={cart.applyingCoupon || !code.trim()}>Apply</Button>
                </div>
              )}
              {cart.couponError && <p role="alert" className="text-xs text-destructive">{cart.couponError}</p>}
              <CartTotals />
              <Button className="w-full" onClick={() => nav("/checkout")}>Checkout</Button>
              <Button variant="ghost" className="w-full" onClick={cart.clear}><Trash2 className="mr-1 h-4 w-4" /> Clear cart</Button>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Cart;
