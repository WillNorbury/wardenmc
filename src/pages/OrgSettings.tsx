import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { confirm } from "@/lib/confirm";
import { toast } from "sonner";
import { ArrowLeft, Building2, Loader2, Save, Trash2 } from "lucide-react";

type Org = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export default function OrgSettings() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [org, setOrg] = useState<Org | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await (supabase.from("organizations" as any) as any)
        .select("id, slug, name, description, avatar_url")
        .eq("slug", slug)
        .maybeSingle();
      if (!active) return;
      const row = data as Org | null;
      setOrg(row);
      if (row) {
        setName(row.name ?? "");
        setOrgSlug(row.slug ?? "");
        setDescription(row.description ?? "");
        setAvatarUrl(row.avatar_url ?? "");
        if (user) {
          const { data: ownerFlag } = await supabase.rpc("is_org_owner", { _org_id: row.id });
          if (active) setIsOwner(!!ownerFlag);
        } else {
          setIsOwner(false);
        }
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [slug, user]);

  const save = async () => {
    if (!org) return;
    const cleanName = name.trim();
    const cleanSlug = slugify(orgSlug || cleanName);
    if (!cleanName) return toast.error("Name is required");
    if (!cleanSlug) return toast.error("URL slug is required");

    setSaving(true);
    const { error } = await (supabase.from("organizations" as any) as any)
      .update({
        name: cleanName,
        slug: cleanSlug,
        description: description.trim(),
        avatar_url: avatarUrl.trim() || null,
      })
      .eq("id", org.id);
    setSaving(false);

    if (error) {
      toast.error(
        error.code === "23505" ? "That URL slug is already taken" : error.message
      );
      return;
    }
    toast.success("Organization updated");
    setOrg({ ...org, name: cleanName, slug: cleanSlug });
    if (cleanSlug !== org.slug) navigate(`/organization/${cleanSlug}/settings`, { replace: true });
  };

  const remove = async () => {
    if (!org) return;
    if (
      !(await confirm({
        title: `Delete "${org.name}"?`,
        description:
          "The organization will be permanently deleted. Projects linked to it will be unlinked, not deleted.",
        confirmText: "Delete organization",
        destructive: true,
      }))
    )
      return;
    setDeleting(true);
    const { error } = await (supabase.from("organizations" as any) as any)
      .delete()
      .eq("id", org.id);
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success("Organization deleted");
    navigate("/profile", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container pt-28 pb-16 max-w-3xl">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to={org ? `/organization/${org.slug}` : "/users"}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to organization
          </Link>
        </Button>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-16 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading organization…
          </div>
        ) : !org ? (
          <Card className="p-10 text-center text-muted-foreground">
            Organization not found.
          </Card>
        ) : !isOwner ? (
          <Card className="p-10 text-center text-muted-foreground">
            Only the organization owner can manage these settings.
          </Card>
        ) : (
          <div className="space-y-6">
            <header className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={avatarUrl || undefined} alt={name} />
                <AvatarFallback>
                  <Building2 className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">Organization settings</h1>
                <p className="text-sm text-muted-foreground">/org/{org.slug}</p>
              </div>
            </header>

            <Card className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Name</Label>
                <Input
                  id="org-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Studio"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug">URL slug</Label>
                <Input
                  id="org-slug"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  onBlur={() => setOrgSlug((s) => slugify(s))}
                  placeholder="my-studio"
                />
                <p className="text-xs text-muted-foreground">
                  Your page will live at /org/{slugify(orgSlug || name) || "…"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-avatar">Avatar URL</Label>
                <Input
                  id="org-avatar"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-desc">Description</Label>
                <Textarea
                  id="org-desc"
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this organization build?"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={save} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1.5" />
                  )}
                  Save changes
                </Button>
              </div>
            </Card>

            <Card className="p-6 border-destructive/40 space-y-3">
              <h2 className="font-semibold text-destructive">Danger zone</h2>
              <p className="text-sm text-muted-foreground">
                Deleting an organization is permanent. Projects linked to it will be
                unlinked, not deleted.
              </p>
              <Button variant="destructive" onClick={remove} disabled={deleting}>
                {deleting ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1.5" />
                )}
                Delete organization
              </Button>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
