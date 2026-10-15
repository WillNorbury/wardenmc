import { beforeEach, describe, expect, it } from "vitest";
import { bootstrapTheme, discardAppearancePreview, previewAppearance, readSavedAppearance, saveAppearance } from "@/lib/preferences";
import { DEFAULT_CUSTOM_THEME, normalizeCustomTheme, readableForeground } from "@/lib/theme-colors";

describe("profile theme saving", () => {
  beforeEach(() => { localStorage.clear(); bootstrapTheme(); });

  it("saves user-created colors and restores them after an unsaved edit", () => {
    const custom = { ...DEFAULT_CUSTOM_THEME, primary: "#ffbb22", sidebar: "#123456" };
    saveAppearance("dark", "custom", custom);
    previewAppearance("dark", "custom", { ...custom, primary: "#ffffff" });
    bootstrapTheme();
    expect(document.documentElement.dataset.palette).toBe("custom");
    expect(JSON.parse(localStorage.getItem("zy-custom-theme") ?? "{}")).toEqual(custom);
    expect(document.documentElement.style.getPropertyValue("--custom-primary")).toBe("41.18 100.00% 56.67%");
  });

  it("rejects invalid color values", () => {
    expect(normalizeCustomTheme({ primary: "url(https://example.com)" }).primary).toBe(DEFAULT_CUSTOM_THEME.primary);
  });

  it("chooses readable text on light and dark custom colors", () => {
    expect(readableForeground("#ffffff")).toBe("0 0% 0%");
    expect(readableForeground("#000000")).toBe("0 0% 100%");
  });

  it("does not persist an unsaved custom theme and restores the default on exit", () => {
    previewAppearance("light", "rose");
    expect(document.documentElement.dataset.palette).toBe("rose");
    expect(readSavedAppearance()).toEqual({ theme: "dark", palette: "default" });
    discardAppearancePreview();
    expect(document.documentElement.dataset.palette).toBe("default");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("keeps an explicitly saved custom theme after reload", () => {
    previewAppearance("light", "ocean");
    saveAppearance("light", "ocean");
    bootstrapTheme();
    expect(readSavedAppearance()).toEqual({ theme: "light", palette: "ocean" });
    expect(document.documentElement.dataset.palette).toBe("ocean");
  });

  it("restores an existing saved theme instead of an unsaved replacement", () => {
    saveAppearance("dark", "forest");
    previewAppearance("light", "ember");
    bootstrapTheme();
    expect(document.documentElement.dataset.palette).toBe("forest");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});