import { beforeEach, describe, expect, it } from "vitest";
import { bootstrapTheme, discardAppearancePreview, previewAppearance, readSavedAppearance, saveAppearance } from "@/lib/preferences";

describe("profile theme saving", () => {
  beforeEach(() => { localStorage.clear(); bootstrapTheme(); });

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