import { supabase } from "@/integrations/supabase/client";
import { formatMoney, type useCart } from "@/lib/cart";

type Cart = ReturnType<typeof useCart>;

/** Builds the support-ticket subject and body for a store order. */
export function buildOrderTicket(cart: Cart, note?: string) {
  const lines = cart.items.flatMap((ci) => {
    const base = `• ${ci.name} × ${ci.quantity} — ${formatMoney(
      (Number(ci.price) || 0) * ci.quantity,
      (ci.currency || cart.currency || "USD").toUpperCase(),
    )}${ci.recipient ? `  (gift to: ${ci.recipient})` : ""}`;
    return ci.giftMessage ? [base, `   ↳ Message: ${ci.giftMessage}`] : [base];
  });
  const body = ["New store checkout submitted via the website.", "", "Items:", ...lines, "",
    `Subtotal: ${formatMoney(cart.subtotal, cart.currency)}`];
  if (cart.storeSaleDiscount > 0) body.push(`Store sale: -${formatMoney(cart.storeSaleDiscount, cart.currency)}`);
  if (cart.coupon && cart.discount > 0) body.push(`Coupon ${cart.coupon.code}: -${formatMoney(cart.discount, cart.currency)}`);
  if (cart.creatorCode && cart.creatorDiscount > 0) body.push(`Creator code ${cart.creatorCode.code}: -${formatMoney(cart.creatorDiscount, cart.currency)}`);
  if (cart.bundleDiscount > 0) body.push(`Bundle discount (${cart.bundlePercent}%): -${formatMoney(cart.bundleDiscount, cart.currency)}`);
  body.push(`Total: ${formatMoney(cart.total, cart.currency)}`);
  const cleanNote = note?.trim().slice(0, 1000);
  if (cleanNote) body.push("", "Customer note:", cleanNote);
  body.push("", "Staff: please reply with payment instructions or fulfillment status.");
  const subject = `Store order — ${cart.count} item${cart.count === 1 ? "" : "s"} (${formatMoney(cart.total, cart.currency)})`;
  return { subject, body: body.join("\n") };
}

export async function submitOrder(cart: Cart, userId: string, note?: string) {
  const { subject, body } = buildOrderTicket(cart, note);
  const { data, error } = await supabase
    .from("support_tickets")
    .insert({ subject, body, category: "Store & Payments", priority: "normal", user_id: userId })
    .select("id")
    .single();
  if (error) throw new Error(error.message || "Could not send your order.");
  return data.id as string;
}
