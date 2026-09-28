import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  DEFAULT_PERMISSIONS,
  type PermissionMatrix,
} from "@/lib/permissions";
import { type AppRole } from "@/lib/roles";

const PERMISSIONS_KEY = "role_permissions";

let cache: PermissionMatrix | null = null;
const subscribers = new Set<(m: PermissionMatrix) => void>();

const loadMatrix = async (): Promise<PermissionMatrix> => {
  const { data } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", PERMISSIONS_KEY)
    .maybeSingle();
  const v = (data?.value as PermissionMatrix | null) ?? null;
  return v && Object.keys(v).length ? v : DEFAULT_PERMISSIONS;
};

export const savePermissionMatrix = async (matrix: PermissionMatrix) => {
  const { error } = await supabase
    .from("site_content")
    .upsert({ key: PERMISSIONS_KEY, value: matrix as any }, { onConflict: "key" });
  if (error) throw error;
  cache = matrix;
  subscribers.forEach((cb) => cb(matrix));
};

export const usePermissionMatrix = () => {
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(cache);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let active = true;
    if (!cache) {
      loadMatrix().then((m) => {
        if (!active) return;
        cache = m;
        setMatrix(m);
        setLoading(false);
      });
    }
    const cb = (m: PermissionMatrix) => setMatrix(m);
    subscribers.add(cb);
    return () => { active = false; subscribers.delete(cb); };
  }, []);

  return { matrix: matrix ?? DEFAULT_PERMISSIONS, loading };
};

export const usePermissions = () => {
  const { user, isAdmin } = useAuth();
  const { matrix, loading: matrixLoading } = usePermissionMatrix();
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user) { setRoles([]); setLoading(false); return; }
    Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("user_custom_roles").select("role_key").eq("user_id", user.id),
    ]).then(([builtIn, custom]) => {
      if (!active) return;
      const a = ((builtIn.data ?? []) as { role: string }[]).map((r) => r.role);
      const b = ((custom.data ?? []) as { role_key: string }[]).map((r) => r.role_key);
      setRoles([...a, ...b]);
      setLoading(false);
    });
    return () => { active = false; };
  }, [user]);

  const allowedSet = new Set<string>();
  for (const r of roles) {
    const list = (matrix as any)[r] ?? [];
    list.forEach((p) => allowedSet.add(p));
  }

  const can = (key: string) => {
    // Owner of the system: DB-level admin always has full client access too.
    if (roles.includes("founder") || roles.includes("star")) return true;
    if (isAdmin && (key === "admin.access" || key === "permissions.edit")) return true;
    return allowedSet.has(key);
  };

  return { can, roles, loading: loading || matrixLoading };
};
