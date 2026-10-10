import { useEffect, useState } from "react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { ALL_ROLES, roleLabel, type AppRole } from "@/lib/roles";
import { userProfilePath, userProfileSlug } from "@/lib/userSlug";
import { Link } from "react-router-dom";
import { GlassCard, PageHero, Reveal } from "@/components/site/ui-kit";
import { ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type StaffMember = {
  user_id: string;
  role: AppRole;
  display_name: string | null;
  avatar_url: string | null;
  mc_username: string | null;
  affiliate_count: number;
};

const STAFF_ROLES: AppRole[] = [
  "founder",
  "owner", "manager", "developer",
  "sr_admin", "admin",
  "sr_mod", "mod",
  "sr_helper", "helper",
];

const roleRank = (r: AppRole) => {
  const idx = ALL_ROLES.findIndex((x) => x.value === r);
  return idx === -1 ? 999 : idx;
};

const Staff = () => {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Staff — Warden Network";
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id,role")
        .in("role", STAFF_ROLES);
      const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
      if (ids.length === 0) {
        setLoading(false);
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_url,mc_username")
        .in("id", ids);
      const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const { data: affiliates } = await supabase
        .from("user_affiliates")
        .select("owner_id")
        .in("owner_id", ids);
      const affiliateCounts = new Map<string, number>();
      (affiliates ?? []).forEach((a) => {
        affiliateCounts.set(a.owner_id, (affiliateCounts.get(a.owner_id) ?? 0) + 1);
      });
      // For each user, pick their highest-ranked staff role
      const byUser = new Map<string, StaffMember>();
      (roles ?? []).forEach((r) => {
        const existing = byUser.get(r.user_id);
        const role = r.role as AppRole;
        if (!existing || roleRank(role) < roleRank(existing.role)) {
          const prof = profMap.get(r.user_id);
          byUser.set(r.user_id, {
            user_id: r.user_id,
            role,
            display_name: prof?.display_name ?? null,
            avatar_url: prof?.avatar_url ?? null,
            mc_username: prof?.mc_username ?? null,
            affiliate_count: affiliateCounts.get(r.user_id) ?? 0,
          });
        }
      });
      const list = Array.from(byUser.values()).sort(
        (a, b) => roleRank(a.role) - roleRank(b.role)
      );
      setMembers(list);
      setLoading(false);
    })();
  }, []);

  // Group by role
  const grouped = STAFF_ROLES.map((role) => ({
    role,
    members: members.filter((m) => m.role === role),
  })).filter((g) => g.members.length > 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">
        <PageHero
          eyebrow={<><ShieldCheck className="h-3 w-3 mr-1" /> The Team</>}
          title="Meet the"
          highlight="Staff"
          description="The people keeping Warden Network running smoothly — moderation, development, builds and support."
        >
          {!loading && members.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="border-primary/30">
                {members.length} member{members.length === 1 ? "" : "s"}
              </Badge>
              <Badge variant="secondary" className="border-primary/30">
                {grouped.length} rank{grouped.length === 1 ? "" : "s"}
              </Badge>
            </div>
          )}
        </PageHero>

        <div className="container pb-24 max-w-[1400px]">
          {loading ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <p className="text-muted-foreground">No staff members to show yet.</p>
            </GlassCard>
          ) : (
            <div className="space-y-14">
              {grouped.map(({ role, members }, gi) => (
                <section key={role}>
                  <Reveal delay={gi * 60}>
                    <div className="flex items-center gap-3 mb-5">
                      <h2 className="font-display text-lg md:text-xl font-black tracking-tight">
                        {roleLabel(role)}
                      </h2>
                      <span className="h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
                      <Badge variant="secondary" className="border-primary/30">{members.length}</Badge>
                    </div>
                  </Reveal>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {members.map((m, i) => {
                      const name = m.display_name ?? m.mc_username ?? "Unknown";
                      const initials = name.slice(0, 2).toUpperCase();
                      const skin = m.mc_username
                        ? `https://mc-heads.net/avatar/${m.mc_username}/96`
                        : null;
                      const slug = userProfileSlug({ id: m.user_id, display_name: m.display_name, mc_username: m.mc_username });
                      return (
                        <Reveal key={m.user_id} delay={i * 45}>
                          <GlassCard interactive className="h-full">
                            <div className="p-5">
                              <Link
                                to={userProfilePath({ id: m.user_id, display_name: m.display_name, mc_username: m.mc_username })}
                                className="flex items-center gap-4"
                              >
                                <Avatar className="h-14 w-14 ring-2 ring-primary/30">
                                  <AvatarImage src={skin ?? m.avatar_url ?? undefined} alt={name} />
                                  <AvatarFallback>{initials}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-semibold truncate">{name}</p>
                                  <p className="text-xs text-primary/90 truncate">{roleLabel(m.role)}</p>
                                </div>
                              </Link>
                              <Link
                                to={`/user/${slug}/affiliates`}
                                className="mt-3 inline-block text-sm text-muted-foreground hover:underline"
                              >
                                <strong className="text-foreground">{m.affiliate_count}</strong> Affiliate{m.affiliate_count === 1 ? "" : "s"}
                              </Link>
                            </div>
                          </GlassCard>
                        </Reveal>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Staff;
