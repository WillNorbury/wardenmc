import { applyCustomThemeColors, DEFAULT_CUSTOM_THEME, normalizeCustomTheme, type CustomTheme } from "./theme-colors";

export type ThemePref = "dark" | "light" | "system";
export const THEME_PALETTES = [
  { id: "default", label: "Warden" },
  { id: "ocean", label: "Ocean" },
  { id: "forest", label: "Forest" },
  { id: "rose", label: "Rose" },
  { id: "ember", label: "Ember" },
  { id: "custom", label: "My theme" },
] as const;
export type ThemePalette = typeof THEME_PALETTES[number]["id"];

export function normalizePalette(value: unknown): ThemePalette {
  return THEME_PALETTES.find((palette) => palette.id === value)?.id ?? "default";
}

export function normalizeTheme(value: unknown): ThemePref {
  return value === "light" || value === "system" ? value : "dark";
}

export type UserPreferences = {
  theme?: ThemePref;
  palette?: ThemePalette;
  custom_theme?: CustomTheme;
  notify_news?: boolean;
  notify_updates?: boolean;
  notify_tickets?: boolean;
  notify_applications?: boolean;
};

export const DEFAULT_PREFS: Required<UserPreferences> = {
  theme: "dark",
  palette: "default",
  custom_theme: DEFAULT_CUSTOM_THEME,
  notify_news: true,
  notify_updates: true,
  notify_tickets: true,
  notify_applications: true,
};

let previewActive = false;
let activeCustomTheme = DEFAULT_CUSTOM_THEME;

export function readSavedCustomTheme(): CustomTheme {
  try { return normalizeCustomTheme(JSON.parse(localStorage.getItem("zy-custom-theme") ?? "null")); }
  catch { return DEFAULT_CUSTOM_THEME; }
}

export function readSavedAppearance() {
  try {
    return {
      theme: normalizeTheme(localStorage.getItem("zy-theme")),
      palette: normalizePalette(localStorage.getItem("zy-palette")),
    };
  } catch {
    return { theme: DEFAULT_PREFS.theme, palette: DEFAULT_PREFS.palette };
  }
}

export function applyTheme(theme: ThemePref, palette: ThemePalette = normalizePalette(document.documentElement.dataset.palette), persist = !previewActive, customTheme: CustomTheme = activeCustomTheme) {
  const root = document.documentElement;
  activeCustomTheme = normalizeCustomTheme(customTheme);
  applyCustomThemeColors(activeCustomTheme);
  const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)").matches;
  const useLight = theme === "light" || (theme === "system" && prefersLight);
  root.classList.toggle("dark", !useLight);
  root.classList.toggle("light", useLight);
  root.dataset.palette = normalizePalette(palette);
  window.dispatchEvent(new Event("appearance-change"));
  if (!persist) return;
  try {
    localStorage.setItem("zy-theme", theme);
    localStorage.setItem("zy-palette", palette);
    localStorage.setItem("zy-custom-theme", JSON.stringify(activeCustomTheme));
  } catch {}
}

export function previewAppearance(theme: ThemePref, palette: ThemePalette, customTheme: CustomTheme = activeCustomTheme) {
  previewActive = true;
  applyTheme(theme, palette, false, customTheme);
}

export function saveAppearance(theme: ThemePref, palette: ThemePalette, customTheme: CustomTheme = DEFAULT_CUSTOM_THEME) {
  previewActive = false;
  applyTheme(theme, palette, true, customTheme);
}

export function discardAppearancePreview() {
  previewActive = false;
  const saved = readSavedAppearance();
  applyTheme(saved.theme, saved.palette, false, readSavedCustomTheme());
}

export function bootstrapTheme() {
  discardAppearancePreview();
}
