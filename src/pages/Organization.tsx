import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { canManageOrganization } from "@/lib/organization-access";
import { ArrowLeft, Loader2, Settings } from "lucide-react";

export default function Organization() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [org, setOrg] = useState<{ id: string; name: string; description: string; avatar_url: string | null; owner_id: string } | null>(null);
  const [members, setMembers] = useState<{ user_id: string; role: string; name: string }[]>([]);
  const [plugins, setPlugins] = useState<{ id: string; slug: string | null; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.from("organizations").select("id, name, description, avatar_url, owner_id").eq("slug", slug ?? "").maybeSingle();
      if (!active) return;
      setOrg(data); setError(error?.message ?? "");
      if (data) {
        document.title = `${data.name} — Warden Network`;
        const [membership, projects] = await Promise.all([
          supabase.from("organization_members").select("user_id, role").eq("org_id", data.id),
          supabase.from("plugins").select("id, slug, name").eq("org_id", data.id).eq("published", true),
        ]);
        const ids = (membership.data ?? []).map(m => m.user_id);
        const profiles = ids.length ? await supabase.from("profiles").select("id, display_name, mc_username").in("id", ids) : { data: [] };
        if (!active) return;
        setMembers((membership.data ?? []).map(m => {
          const p = profiles.data?.find(p => p.id === m.user_id);
          return { ...m, name: p?.display_name || p?.mc_username || "Member" };
        }));
        setPlugins(projects.data ?? []);
        setError(membership.error?.message || projects.error?.message || "");
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [slug]);
  return <div className="flex min-h-screen flex-col"><Navbar />
    <main className="container max-w-5xl flex-1 pt-28 pb-16">
      <Button asChild variant="ghost" className="mb-6"><Link to="/organizations"><ArrowLeft className="mr-2 h-4 w-4" />Organizations</Link></Button>
      {loading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : !org ? <h1 className="font-display text-3xl">{error || "Organization not found"}</h1> : <>
        <header className="flex flex-wrap items-center gap-5 border-b border-border pb-8">
          <Avatar className="h-20 w-20"><AvatarImage src={org.avatar_url ?? undefined} /><AvatarFallback>{org.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1"><h1 className="font-display text-4xl font-bold break-words">{org.name}</h1><p className="mt-3 whitespace-pre-wrap break-words text-muted-foreground">{org.description}</p></div>
          {canManageOrganization(org.owner_id, user?.id) && <Button asChild variant="outline"><Link to={`/organization/${slug}/settings`}><Settings className="mr-2 h-4 w-4" />Settings</Link></Button>}
        </header>
        {error && <p role="alert" className="mt-4 text-destructive">{error}</p>}
        <section className="py-8"><h2 className="font-display text-2xl font-bold mb-4">Plugins</h2>{plugins.length ? <div className="grid gap-3 sm:grid-cols-2">{plugins.map(p => <Link className="rounded-lg border border-border p-4 hover:border-primary" key={p.id} to={`/plugin/${p.slug || p.id}`}>{p.name}</Link>)}</div> : <p className="text-muted-foreground">No published plugins yet.</p>}</section>
        <section className="border-t border-border pt-8"><h2 className="font-display text-2xl font-bold mb-4">Members</h2><ul className="divide-y divide-border">{members.map(m => <li key={m.user_id} className="flex items-center justify-between gap-3 py-3"><Link className="break-words hover:text-primary" to={`/user/${m.user_id}`}>{m.name}</Link><Badge variant="secondary" className="capitalize">{m.role}</Badge></li>)}</ul></section>
      </>}
    </main><Footer /></div>;
}