import { describe, expect, it } from "vitest";
import { parseLiveLogins } from "../../supabase/functions/twitch-status/channels";

describe("parseLiveLogins", () => {
  it("returns an empty list for missing or blank input", () => {
    expect(parseLiveLogins(null)).toEqual([]);
    expect(parseLiveLogins("")).toEqual([]);
    expect(parseLiveLogins(" , ,")).toEqual([]);
  });

  it("lowercases, trims, dedupes and drops invalid logins", () => {
    expect(parseLiveLogins("KaiCenat, ibai ,KAICENAT, bad login!, a")).toEqual(["kaicenat", "ibai"]);
  });

  it("caps the list at 50 logins", () => {
    const many = Array.from({ length: 60 }, (_, i) => `user${i}`).join(",");
    expect(parseLiveLogins(many)).toHaveLength(50);
  });
});
