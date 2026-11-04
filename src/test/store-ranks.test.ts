import { describe, expect, it } from "vitest";
import { RANK_PRODUCTS, rankCartItem, storeAccess } from "@/lib/store-ranks";
import { buildOrderTicket } from "@/lib/cart-checkout";

describe("store ranks", () => {
  it("prices VIP at 9.99 USD", () => expect(RANK_PRODUCTS[0].price).toBe(9.99));
  it("prices Custom Rank at 19.99 USD", () => expect(RANK_PRODUCTS[1].price).toBe(19.99));
  it("requires sign-in before store access", () => {
    expect(storeAccess(false, false)).toBe("sign-in");
    expect(storeAccess(false, true)).toBe("allowed");
    expect(storeAccess(true, true)).toBe("loading");
  });
  it("requires a custom rank prefix", () => {
    expect(() => rankCartItem({ ...RANK_PRODUCTS[1], currency: "USD" }, " ")).toThrow("Enter a rank prefix");
  });
  it("preserves the prefix through cart persistence and order details", () => {
    const item = JSON.parse(JSON.stringify({ ...rankCartItem({ ...RANK_PRODUCTS[1], currency: "USD" }, "[Legend]"), quantity: 1 }));
    const ticket = buildOrderTicket({ items: [item], subtotal: 19.99, total: 19.99, currency: "USD", count: 1 } as Parameters<typeof buildOrderTicket>[0]);
    expect(ticket.body).toContain("Rank prefix: [Legend]");
    expect(item.currency).toBe("USD");
    expect(rankCartItem({ ...RANK_PRODUCTS[1], currency: "USD" }, "[Other]").id).not.toBe(item.id);
  });
});