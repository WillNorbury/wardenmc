import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { userProfilePath } from "@/lib/userSlug";
import { GlassCard, PageHero, Reveal } from "@/components/site/ui-kit";
import { BadgeCheck, Search, Users as UsersIcon } from "lucide-react";

type Member = {
  id: string;
  display_name: string | null;
  mc_username: string | null;
  avatar_url: string | null;
  bio: string | null;
  verified: boolean | null;
  created_at: string;
};

const PAGE_SIZE = 48;

const Users = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    document.title = "Members — Warden Network";
    (async () => {
      const { data, count } = await supabase
        .from("profiles")
        .select("id,display_name,mc_username,avatar_url,bio,verified,created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(500);
      setMembers((data ?? []) as Member[]);
      setTotal(count ?? 0);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      (m.display_name ?? "").toLowerCase().includes(q) ||
      (m.mc_username ?? "").toLowerCase().includes(q)
    );
  }, [members, query]);

  const shown = filtered.slice(0, visible);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">
        <PageHero
          eyebrow={<><UsersIcon className="h-3 w-3 mr-1" /> Community</>}
          title="Meet the"
          highlight="Members"
          description="Everyone who has signed up to WardenMC — newest members first."
        >
          {!loading && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="border-primary/30">
                {total} member{total === 1 ? "" : "s"}
              </Badge>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setVisible(PAGE_SIZE); }}
                  placeholder="Search members…"
                  className="pl-9 w-64"
                />
              </div>
            </div>
          )}
        </PageHero>

        <div className="container pb-24 max-w-[1400px]">
          {loading ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <p className="text-muted-foreground">
                {query ? `No members matching "${query}".` : "No members yet — be the first to sign up!"}
              </p>
            </GlassCard>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {shown.map((m, i) => {
                  const name = m.display_name ?? m.mc_username ?? "Unknown";
                  const initials = name.slice(0, 2).toUpperCase();
                  const skin = m.mc_username
                    ? `https://mc-heads.net/avatar/${m.mc_username}/96`
                    : null;
                  return (
                    <Reveal key={m.id} delay={Math.min(i, 12) * 40}>
                      <GlassCard interactive className="h-full">
                        <Link
                          to={userProfilePath({ id: m.id, display_name: m.display_name, mc_username: m.mc_username })}
                          className="flex items-center gap-4 p-5"
                        >
                          <Avatar className="h-14 w-14 ring-2 ring-primary/30">
                            <AvatarImage src={skin ?? m.avatar_url ?? undefined} alt={name} />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="flex items-center gap-1 font-semibold truncate">
                              {name}
                              {m.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              Joined {new Date(m.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                        </Link>
                      </GlassCard>
                    </Reveal>
                  );
                })}
              </div>
              {filtered.length > visible && (
                <div className="mt-8 text-center">
                  <button
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                    className="text-sm text-primary hover:underline"
                  >
                    Show more ({filtered.length - visible} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Users;
