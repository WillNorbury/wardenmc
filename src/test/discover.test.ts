import { describe, expect, it } from "vitest";
import { recommendPlugins } from "@/lib/discover";

const p = (id: string, category: string, downloads: number, isFavorite = false) =>
  ({ id, category, downloads, favorites: 0, reviews: 0, isFavorite }) as any;

describe("recommendPlugins", () => {
  it("falls back to most popular when the viewer has no favourites", () => {
    const r = recommendPlugins([p("a", "Economy", 5), p("b", "Chat", 50)]);
    expect(r.personalised).toBe(false);
    expect(r.items.map((x) => x.id)).toEqual(["b", "a"]);
  });
  it("prefers favourited categories and skips already-favourited plugins", () => {
    const r = recommendPlugins([p("fav", "Economy", 1, true), p("eco", "Economy", 2), p("chat", "Chat", 99)]);
    expect(r.personalised).toBe(true);
    expect(r.items.map((x) => x.id)).toEqual(["eco", "chat"]);
  });
});
