import { beforeEach, describe, expect, it } from "vitest";
import {
  listSavedAccounts,
  rememberAccount,
  removeSavedAccount,
} from "@/lib/saved-accounts";

describe("saved accounts", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("remembers a signed-in account with its email and display name", () => {
    rememberAccount({ email: "Will@Example.com", displayName: "Will" });
    expect(listSavedAccounts()).toEqual([
      { email: "will@example.com", displayName: "Will", avatarUrl: undefined },
    ]);
  });

  it("moves a re-used account to the front instead of duplicating it", () => {
    rememberAccount({ email: "a@example.com" });
    rememberAccount({ email: "b@example.com" });
    rememberAccount({ email: "a@example.com", displayName: "A" });
    const accounts = listSavedAccounts();
    expect(accounts.map((a) => a.email)).toEqual([
      "a@example.com",
      "b@example.com",
    ]);
    expect(accounts[0].displayName).toBe("A");
  });

  it("removes a single account and clears storage when the last one goes", () => {
    rememberAccount({ email: "a@example.com" });
    rememberAccount({ email: "b@example.com" });
    removeSavedAccount("a@example.com");
    expect(listSavedAccounts().map((a) => a.email)).toEqual(["b@example.com"]);
    removeSavedAccount("b@example.com");
    expect(listSavedAccounts()).toEqual([]);
    expect(window.localStorage.getItem("warden_saved_accounts")).toBeNull();
  });

  it("never stores more than five accounts", () => {
    for (let i = 0; i < 7; i++) rememberAccount({ email: `u${i}@example.com` });
    const accounts = listSavedAccounts();
    expect(accounts).toHaveLength(5);
    expect(accounts[0].email).toBe("u6@example.com");
  });

  it("ignores corrupted stored data", () => {
    window.localStorage.setItem("warden_saved_accounts", "not json");
    expect(listSavedAccounts()).toEqual([]);
    window.localStorage.setItem(
      "warden_saved_accounts",
      JSON.stringify([{ nope: true }, { email: "ok@example.com" }]),
    );
    expect(listSavedAccounts().map((a) => a.email)).toEqual([
      "ok@example.com",
    ]);
  });
});
