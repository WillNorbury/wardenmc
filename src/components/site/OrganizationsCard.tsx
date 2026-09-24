import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Loader2, Plus } from "lucide-react";

type OrgRow = {
  org_id: string;
  role: "owner" | "admin" | "member";
  organizations: {
    id: string;
    slug: string;
    name: string;
    description: string;
    avatar_url: string | null;
  } | null;
};

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/;

function toSlug(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 32);
}

export default function OrganizationsCard({ userId }: { userId: string }) {
  const [memberships, setMemberships] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("organization_members")
      .select("org_id, role, organizations(id, slug, name, description, avatar_url)")
      .eq("user_id", userId);
    if (error) toast.error(error.message);
    setMemberships((data ?? []) as unknown as OrgRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (userId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const effectiveSlug = slugTouched ? slug : toSlug(name);
  const slugInvalid = !SLUG_RE.test(effectiveSlug);
  const nameInvalid = name.trim().length < 2 || name.trim().length > 60;

  const create = async () => {
    if (nameInvalid) return toast.error("Name must be 2–60 characters");
    if (slugInvalid) return toast.error("Slug: 2–32 chars, lowercase letters, numbers, dashes");
    setCreating(true);
    const { error } = await supabase.from("organizations").insert({
      name: name.trim(),
      slug: effectiveSlug,
      description: description.trim(),
      avatar_url: avatarUrl.trim() || null,
      owner_id: userId,
    });
    setCreating(false);
    if (error) {
      if (error.code === "23505") return toast.error("That slug is already taken");
      return toast.error(error.message);
    }
    toast.success("Organization created");
    setOpen(false);
    setName("");
    setSlug("");
    setSlugTouched(false);
    setDescription("");
    setAvatarUrl("");
    load();
  };

  return (
    <Card className="p-6 mt-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="font-display font-bold text-lg">Organizations</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> New organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create an organization</DialogTitle>
              <DialogDescription>
                Organizations let you group your projects and collaborate with teammates.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label htmlFor="org_name">Name</Label>
                <Input
                  id="org_name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slugTouched) setSlug(toSlug(e.target.value));
                  }}
                  placeholder="Acme Studios"
                  maxLength={60}
                />
              </div>
              <div>
                <Label htmlFor="org_slug">Slug</Label>
                <Input
                  id="org_slug"
                  value={effectiveSlug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  }}
                  placeholder="acme-studios"
                  maxLength={32}
                  aria-invalid={slugInvalid}
                  className={slugInvalid ? "border-destructive focus-visible:ring-destructive" : undefined}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Lowercase letters, numbers and dashes. Used in URLs.
                </p>
              </div>
              <div>
                <Label htmlFor="org_description">Description (optional)</Label>
                <Textarea
                  id="org_description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this organization do?"
                  rows={3}
                  maxLength={500}
                />
              </div>
              <div>
                <Label htmlFor="org_avatar">Avatar URL (optional)</Label>
                <Input
                  id="org_avatar"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button onClick={create} disabled={creating || nameInvalid || slugInvalid}>
                {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : memberships.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You're not part of any organizations yet. Create one to get started.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {memberships.map((m) => {
            const org = m.organizations;
            if (!org) return null;
            const initials = org.name.slice(0, 2).toUpperCase();
            return (
              <li key={m.org_id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={org.avatar_url ?? undefined} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <Link to={`/organization/${org.slug}`} className="font-semibold truncate hover:text-primary block">{org.name}</Link>
                    <div className="text-xs text-muted-foreground font-mono truncate">/organization/{org.slug}</div>
                  </div>
                </div>
                <Badge variant={m.role === "owner" ? "default" : "secondary"} className="capitalize">
                  {m.role}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
