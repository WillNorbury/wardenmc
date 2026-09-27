import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { ALL_ROLES, roleLabel, isVerifiedRole, type AppRole } from "@/lib/roles";
import { userProfilePath } from "@/lib/userSlug";
import { VerifiedBadge } from "@/components/site/VerifiedBadge";
import { Loader2, Search, Users as UsersIcon } from "lucide-react";

type Profile = {
  verified?: boolean | null;
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  mc_username: string | null;
  created_at: string;
};

const roleRank = (r: AppRole) => {
  const idx = ALL_ROLES.findIndex((x) => x.value === r);
  return idx === -1 ? 999 : idx;
};

const Users = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rolesByUser, setRolesByUser] = useState<Record<string, AppRole[]>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Members — Warden Network";
    (async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("id, display_name, avatar_url, mc_username, created_at, verified").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const grouped: Record<string, AppRole[]> = {};
      ((r ?? []) as { user_id: string; role: AppRole }[]).forEach((row) => {
        (grouped[row.user_id] ??= []).push(row.role);
      });
      Object.keys(grouped).forEach((k) => grouped[k].sort((a, b) => roleRank(a) - roleRank(b)));
      setProfiles((p ?? []) as Profile[]);
      setRolesByUser(grouped);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) =>
      (p.display_name ?? "").toLowerCase().includes(q) ||
      (p.mc_username ?? "").toLowerCase().includes(q) ||
      p.id.startsWith(q)
    );
  }, [profiles, search]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-2">
          <UsersIcon className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-display font-bold text-glow">Members</h1>
        </div>
        <p className="text-muted-foreground mb-8">Browse the Warden Network community.</p>

        <div className="relative max-w-md mb-6">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, username, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-4">
              {filtered.length} {filtered.length === 1 ? "member" : "members"}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => {
                const roles = rolesByUser[p.id] ?? [];
                const topRole = roles[0];
                const initials = (p.display_name ?? "?").slice(0, 2).toUpperCase();
                const avatar = p.avatar_url || (p.mc_username ? `https://mc-heads.net/avatar/${p.mc_username}/128` : undefined);
                return (
                  <Link key={p.id} to={userProfilePath(p)}>
                    <Card className="p-4 flex items-center gap-3 hover:border-primary/50 transition-colors h-full">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={avatar} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate flex items-center gap-1"><span className="truncate">{p.display_name ?? "Unnamed"}</span>{(p.verified || (rolesByUser[p.id] ?? []).some(isVerifiedRole)) && <VerifiedBadge className="h-4 w-4 shrink-0" />}</div>
                        <div className="text-xs text-muted-foreground font-mono truncate">
                          {p.mc_username ? `@${p.mc_username}` : p.id.slice(0, 8)}
                        </div>
                        {topRole && (
                          <Badge variant="secondary" className="mt-1 text-xs">{roleLabel(topRole)}</Badge>
                        )}
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">No members found.</div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Users;
