import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { SEO } from "@/components/site/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useCart, formatMoney } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { submitOrder } from "@/lib/cart-checkout";
import { CartTotals } from "@/pages/Cart";
import { ArrowLeft, CreditCard, Package } from "lucide-react";
import { toast } from "sonner";

const Checkout = () => {
  const cart = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const placeOrder = async () => {
    if (!user) {
      nav("/auth?next=/checkout");
      return;
    }
    setSending(true);
    try {
      await submitOrder(cart, user.id, note);
      cart.clear();
      toast.success("Order sent — staff will reply with payment instructions.");
      nav("/support");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Checkout — WardenMC" description="Review and place your WardenMC order." path="/checkout" />
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 pb-16 pt-28">
        <Link to="/cart" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to cart
        </Link>
        <h1 className="mb-6 flex items-center gap-2 font-display text-3xl font-bold">
          <CreditCard className="h-7 w-7 text-primary" /> Checkout
        </h1>

        {cart.items.length === 0 ? (
          <Card className="p-10 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">There's nothing to check out yet.</p>
            <Button asChild variant="outline" className="mt-4"><Link to="/cart">View cart</Link></Button>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-[1fr_320px]">
            <Card className="space-y-4 p-5">
              <h2 className="font-semibold">Order summary</h2>
              <ul className="divide-y divide-border text-sm">
                {cart.items.map((ci) => (
                  <li key={ci.id} className="flex justify-between gap-3 py-2">
                    <span>{ci.name} × {ci.quantity}{ci.recipient ? ` (gift to ${ci.recipient})` : ""}</span>
                    <span className="tabular-nums">{formatMoney((Number(ci.price) || 0) * ci.quantity, (ci.currency || "USD").toUpperCase())}</span>
                  </li>
                ))}
              </ul>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">Note for staff (optional)</span>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Minecraft username, preferred payment method…" />
              </label>
            </Card>
            <Card className="h-fit space-y-4 p-5">
              <CartTotals />
              <p className="text-xs text-muted-foreground">
                Placing your order opens a private support ticket. Staff will reply there with payment instructions.
              </p>
              <Button className="w-full" onClick={placeOrder} disabled={sending}>
                {sending ? "Sending…" : user ? "Place order" : "Sign in to place order"}
              </Button>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
