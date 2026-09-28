import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  session: null, user: null, isAdmin: false, loading: true, signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For OAuth sign-ins (e.g. Google), backfill the profile's display name
    // and photo from the provider when they aren't set yet.
    const syncProviderProfile = async (u: User | undefined) => {
      if (!u) return;
      const meta = u.user_metadata ?? {};
      const name = meta.full_name ?? meta.name ?? meta.display_name;
      const avatar = meta.avatar_url ?? meta.picture;
      if (!name && !avatar) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", u.id)
        .maybeSingle();
      if (!profile) return;
      const patch: Record<string, string> = {};
      if (!profile.display_name && name) patch.display_name = name;
      if (!profile.avatar_url && avatar) patch.avatar_url = avatar;
      if (Object.keys(patch).length > 0) {
        await supabase.from("profiles").update(patch).eq("id", u.id);
      }
    };

    const checkRole = async (uid: string | undefined, ctx: string) => {
      if (!uid) { setIsAdmin(false); return; }
      const { data, error } = await supabase.rpc("check_is_admin_logged", {
        _context: ctx,
        _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      });
      if (error) console.error("[auth] admin check failed:", error);
      console.log("[auth] admin check", { uid, ctx, isAdmin: data });
      setIsAdmin(!!data);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((e, s) => {
      setSession(s);
      setTimeout(() => { checkRole(s?.user?.id, `auth-event:${e}`); }, 0);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      await checkRole(session?.user?.id, "init");
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        isAdmin,
        loading,
        signOut: async () => { await supabase.auth.signOut(); },
      }}
    >
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
