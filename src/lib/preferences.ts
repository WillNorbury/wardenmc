export type ThemePref = "dark" | "light" | "system";
export const THEME_PALETTES = [
  { id: "default", label: "Warden" },
  { id: "ocean", label: "Ocean" },
  { id: "forest", label: "Forest" },
  { id: "rose", label: "Rose" },
  { id: "ember", label: "Ember" },
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
  notify_news?: boolean;
  notify_updates?: boolean;
  notify_tickets?: boolean;
  notify_applications?: boolean;
};

export const DEFAULT_PREFS: Required<UserPreferences> = {
  theme: "dark",
  palette: "default",
  notify_news: true,
  notify_updates: true,
  notify_tickets: true,
  notify_applications: true,
};

let previewActive = false;

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

export function applyTheme(theme: ThemePref, palette: ThemePalette = normalizePalette(document.documentElement.dataset.palette), persist = !previewActive) {
  const root = document.documentElement;
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
  } catch {}
}

export function previewAppearance(theme: ThemePref, palette: ThemePalette) {
  previewActive = true;
  applyTheme(theme, palette, false);
}

export function saveAppearance(theme: ThemePref, palette: ThemePalette) {
  previewActive = false;
  applyTheme(theme, palette, true);
}

export function discardAppearancePreview() {
  previewActive = false;
  const saved = readSavedAppearance();
  applyTheme(saved.theme, saved.palette, false);
}

export function bootstrapTheme() {
  discardAppearancePreview();
}
