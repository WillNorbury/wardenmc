import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyTheme, type ThemePref } from "@/lib/preferences";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// Keep the signed-in user's saved preference in sync so the toggle's choice
// isn't overwritten by the server-stored theme on the next page load.
const persistTheme = (theme: ThemePref) => {
  supabase.rpc("get_my_private_profile").then(({ data }) => {
    const row = Array.isArray(data) ? data[0] : null;
    const prefs = { ...((row?.preferences as Record<string, unknown>) ?? {}), theme };
    return supabase.rpc("set_my_preferences", { _prefs: prefs });
  }).catch(() => {});
};

const readStored = (): ThemePref => {
  try {
    return (localStorage.getItem("zy-theme") as ThemePref | null) ?? "dark";
  } catch {
    return "dark";
  }
};

const isLightActive = (t: ThemePref) =>
  t === "light" ||
  (t === "system" && window.matchMedia?.("(prefers-color-scheme: light)").matches);

export const ThemeToggle = ({ className }: { className?: string }) => {
  const [theme, setTheme] = useState<ThemePref>(() => readStored());
  const { user } = useAuth();

  // Re-sync if another tab/page changes preference
  useEffect(() => {
    const onAppearance = () => setTheme(document.documentElement.classList.contains("light") ? "light" : "dark");
    const onStorage = (e: StorageEvent) => {
      if (e.key === "zy-theme" && e.newValue) setTheme(e.newValue as ThemePref);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("appearance-change", onAppearance);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("appearance-change", onAppearance);
    };
  }, []);

  const light = isLightActive(theme);

  const toggle = () => {
    const next: ThemePref = light ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      title={light ? "Switch to dark mode" : "Switch to light mode"}
      className={cn("h-9 w-9", className)}
    >
      <Sun className={cn("h-4 w-4 transition-all", light ? "scale-0 -rotate-90" : "scale-100 rotate-0")} />
      <Moon className={cn("absolute h-4 w-4 transition-all", light ? "scale-100 rotate-0" : "scale-0 rotate-90")} />
    </Button>
  );
};

export default ThemeToggle;
