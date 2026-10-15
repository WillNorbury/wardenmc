export type CustomTheme = {
  background: string;
  surface: string;
  sidebar: string;
  primary: string;
};

export const DEFAULT_CUSTOM_THEME: CustomTheme = {
  background: "#10181b",
  surface: "#18282d",
  sidebar: "#132226",
  primary: "#20c4d7",
};

export const CUSTOM_COLOR_FIELDS = [
  { key: "background", label: "Page background" },
  { key: "surface", label: "Panels & menus" },
  { key: "sidebar", label: "Sidebar" },
  { key: "primary", label: "Accent & buttons" },
] as const;

export function normalizeCustomTheme(value: unknown): CustomTheme {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(CUSTOM_COLOR_FIELDS.map(({ key }) => {
    const color = source[key];
    return [key, typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : DEFAULT_CUSTOM_THEME[key]];
  })) as CustomTheme;
}

function channels(hex: string) {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
}

export function colorToHsl(hex: string) {
  const [r, g, b] = channels(hex).map((value) => value / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const delta = max - min, lightness = (max + min) / 2;
  let hue = 0, saturation = 0;
  if (delta > 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }
  return `${hue.toFixed(2)} ${(saturation * 100).toFixed(2)}% ${(lightness * 100).toFixed(2)}%`;
}

export function readableForeground(hex: string) {
  const [r, g, b] = channels(hex).map((value) => {
    const s = value / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (luminance + 0.05) / 0.05 > 1.05 / (luminance + 0.05) ? "0 0% 0%" : "0 0% 100%";
}

export function applyCustomThemeColors(theme: CustomTheme) {
  const root = document.documentElement;
  const normalized = normalizeCustomTheme(theme);
  for (const { key } of CUSTOM_COLOR_FIELDS) {
    root.style.setProperty(`--custom-${key}`, colorToHsl(normalized[key]));
    root.style.setProperty(`--custom-${key}-foreground`, readableForeground(normalized[key]));
  }
}