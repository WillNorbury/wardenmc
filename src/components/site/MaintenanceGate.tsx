import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MaintenanceScreen } from "./MaintenanceScreen";

type Config = {
  enabled: boolean;
  title?: string;
  message?: string;
  allowed_roles?: string[];
  allowed_user_ids?: string[];
};

const ALLOW = ["/auth", "/admin", "/status"];

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const [cfg, setCfg] = useState<Config>({ enabled: false });
  const [loaded, setLoaded] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const { isAdmin, user } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", "maintenance")
        .maybeSingle();
      if (cancelled) return;
      const v = (data?.value as Config) || { enabled: false };
      setCfg(v);
      setLoaded(true);
    };
    load();
    const channel = supabase
      .channel("maintenance-config")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_content", filter: "key=eq.maintenance" },
        () => load()
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setUserRoles([]);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => setUserRoles((data ?? []).map((r: any) => r.role)));
  }, [user]);

  if (!loaded) return null;

  const allowedRoles = cfg.allowed_roles ?? [];
  const allowedUsers = cfg.allowed_user_ids ?? [];
  const roleAllowed = userRoles.some((r) => allowedRoles.includes(r));
  const userAllowed = !!user && allowedUsers.includes(user.id);

  const bypass =
    isAdmin ||
    roleAllowed ||
    userAllowed ||
    ALLOW.includes(pathname) ||
    pathname.startsWith("/admin");

  if (!cfg.enabled || bypass) return <>{children}</>;

  return <MaintenanceScreen title={cfg.title} message={cfg.message} />;
}
