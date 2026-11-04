import type { CartItem } from "@/lib/cart";

export const RANK_PRODUCTS = [
  { id: "1f492f2a-4527-49d6-879c-6fe3d8f1cc31", name: "VIP", price: 9.99 },
  { id: "b8e412b7-0f2f-42e0-bd31-1d7c2b6cc321", name: "Custom Rank", price: 19.99 },
] as const;

export function storeAccess(loading: boolean, signedIn: boolean) {
  return loading ? "loading" : signedIn ? "allowed" : "sign-in";
}

export function rankCartItem(product: { id: string; name: string; price: number; currency: string }, prefix?: string): Omit<CartItem, "quantity"> {
  const rankPrefix = prefix?.trim();
  if (product.id === RANK_PRODUCTS[1].id && !rankPrefix) throw new Error("Enter a rank prefix.");
  return {
    id: rankPrefix ? `${product.id}:${encodeURIComponent(rankPrefix)}` : product.id,
    productId: product.id,
    name: product.name, price: product.price, currency: product.currency,
    rankPrefix: rankPrefix || null, image_url: null, external_url: null,
  };
}