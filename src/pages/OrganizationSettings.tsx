import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { canManageOrganization } from "@/lib/organization-access";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";

export default function OrganizationSettings() {
  const { slug } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [org, setOrg] = useState<{ id: string; owner_id: string; name: string; description: string; avatar_url: string | null } | null>(null);
  const [members, setMembers] = useState<{ user_id: string; role: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const loadMembers = async (id: string) => {
    const { data, error } = await supabase.from("organization_members").select("user_id, role").eq("org_id", id);
    if (error) { toast.error(error.message); return; }
    const ids = (data ?? []).map(m => m.user_id);
    const profiles = ids.length ? await supabase.from("profiles").select("id, display_name, mc_username").in("id", ids) : { data: [] };
    setMembers((data ?? []).map(m => ({ ...m, name: profiles.data?.find(p => p.id === m.user_id)?.display_name || profiles.data?.find(p => p.id === m.user_id)?.mc_username || "Member" })));
  };
  useEffect(() => {
    document.title = "Organization settings — Warden Network";
    supabase.from("organizations").select("id, owner_id, name, description, avatar_url").eq("slug", slug ?? "").maybeSingle().then(({ data, error }) => {
      setOrg(data); setError(error?.message ?? ""); setLoading(false);
      if (data && canManageOrganization(data.owner_id, user?.id)) void loadMembers(data.id);
    });
  }, [slug, user?.id]);
  const allowed = org && canManageOrganization(org.owner_id, user?.id);
  const save = async () => {
    if (!org || !allowed) return;
    setBusy(true);
    const { error } = await supabase.from("organizations").update({ name: org.name.trim(), description: org.description.trim(), avatar_url: org.avatar_url?.trim() || null }).eq("id", org.id).select("id").single();
    setBusy(false); if (error) toast.error(error.message); else toast.success("Organization saved");
  };
  const add = async () => {
    if (!org || !allowed) return;
    setBusy(true);
    const profile = await supabase.from("profiles").select("id").ilike("mc_username", username.trim().replace(/[%_]/g, c => `\\${c}`)).maybeSingle();
    if (profile.error || !profile.data) { setBusy(false); toast.error(profile.error?.message || "No member with that Minecraft username found"); return; }
    const { error } = await supabase.from("organization_members").insert({ org_id: org.id, user_id: profile.data.id, role: "member" });
    setBusy(false); if (error) toast.error(error.code === "23505" ? "Already a member" : error.message); else { setUsername(""); toast.success("Member added"); await loadMembers(org.id); }
  };
  const remove = async (id: string) => {
    if (!org || !allowed || id === org.owner_id || !window.confirm("Remove this member from the organization?")) return;
    setBusy(true);
    const { error } = await supabase.from("organization_members").delete().eq("org_id", org.id).eq("user_id", id).select("user_id").single();
    setBusy(false); if (error) toast.error(error.message); else { toast.success("Member removed"); await loadMembers(org.id); }
  };
  return <div className="flex min-h-screen flex-col"><Navbar /><main className="container max-w-3xl flex-1 pt-28 pb-16">
    <Button asChild variant="ghost" className="mb-6"><Link to={`/organization/${slug}`}><ArrowLeft className="mr-2 h-4 w-4" />Back to organization</Link></Button>
    {loading || authLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : !org ? <h1>{error || "Organization not found"}</h1> : !allowed ? <><h1 className="font-display text-3xl">Owner access required</h1>{!user && <Button asChild className="mt-4"><Link to="/auth">Sign in</Link></Button>}</> : <>
      <h1 className="font-display text-3xl font-bold mb-8">Organization settings</h1>
      <form className="space-y-5" onSubmit={e => { e.preventDefault(); void save(); }}>
        <div><Label htmlFor="organization-name">Name</Label><Input id="organization-name" required minLength={2} maxLength={60} value={org.name} onChange={e => setOrg({ ...org, name: e.target.value })} /></div>
        <div><Label htmlFor="organization-description">Description</Label><Textarea id="organization-description" maxLength={500} value={org.description} onChange={e => setOrg({ ...org, description: e.target.value })} /></div>
        <div><Label htmlFor="organization-avatar">Avatar URL</Label><Input id="organization-avatar" type="url" value={org.avatar_url ?? ""} onChange={e => setOrg({ ...org, avatar_url: e.target.value })} /></div>
        <Button disabled={busy} type="submit">Save changes</Button>
      </form>
      <section className="mt-10 border-t border-border pt-8"><h2 className="font-display text-2xl font-bold mb-4">Members</h2>
        <form className="flex flex-wrap items-end gap-3 mb-5" onSubmit={e => { e.preventDefault(); void add(); }}><div className="min-w-0 flex-1"><Label htmlFor="member-username">Minecraft username</Label><Input id="member-username" required pattern="[A-Za-z0-9_]{3,16}" value={username} onChange={e => setUsername(e.target.value)} /></div><Button type="submit" disabled={busy}><Plus className="mr-2 h-4 w-4" />Add member</Button></form>
        <ul className="divide-y divide-border">{members.map(m => <li key={m.user_id} className="flex items-center gap-3 py-3"><span className="flex-1 min-w-0 break-words">{m.name}</span><Badge variant="secondary">{m.role}</Badge>{m.user_id !== org.owner_id && <Button variant="ghost" size="icon" title="Remove member" aria-label={`Remove ${m.name}`} disabled={busy} onClick={() => void remove(m.user_id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</li>)}</ul>
      </section>
    </>}
  </main><Footer /></div>;
}