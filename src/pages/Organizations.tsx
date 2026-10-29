import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import OrganizationsCard from "@/components/site/OrganizationsCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Loader2, ArrowUpRight } from "lucide-react";

export default function Organizations() {
  const { user } = useAuth();
  const [rows, setRows] = useState<{ id: string; slug: string; name: string; description: string; avatar_url: string | null }[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    document.title = "Organizations — Warden Network";
    supabase.from("organizations").select("id, slug, name, description, avatar_url").order("name").then(({ data, error }) => {
      setRows(data ?? []); setError(error?.message ?? ""); setLoading(false);
    });
  }, []);
  const filtered = rows.filter(row => `${row.name} ${row.description}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="flex min-h-screen flex-col">
    <Navbar />
    <main className="container max-w-5xl flex-1 pt-28 pb-16">
      <h1 className="font-display text-4xl font-bold">Organizations</h1>
      <Input className="my-6 max-w-md" aria-label="Search organizations" placeholder="Search organizations…" value={query} onChange={e => setQuery(e.target.value)} />
      {loading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : error ? <p role="alert" className="text-destructive">{error}</p> : filtered.length === 0 ? <p className="text-muted-foreground">No organizations found.</p> : <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map(row => <Link key={row.id} to={`/organization/${row.slug}`} className="flex items-start gap-4 rounded-lg border border-border p-5 hover:border-primary">
          <Avatar className="h-12 w-12"><AvatarImage src={row.avatar_url ?? undefined} /><AvatarFallback>{row.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1"><h2 className="font-display text-xl font-bold break-words">{row.name}</h2><p className="mt-2 line-clamp-3 break-words text-sm text-muted-foreground">{row.description}</p></div><ArrowUpRight className="h-4 w-4 shrink-0 text-primary" />
        </Link>)}
      </div>}
      {user ? <OrganizationsCard userId={user.id} /> : <Button asChild className="mt-8"><Link to="/auth">Sign in to create an organization</Link></Button>}
    </main><Footer />
  </div>;
}