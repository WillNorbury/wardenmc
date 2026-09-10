import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { userProfilePath } from "@/lib/userSlug";
import { toast } from "sonner";
import {
  Boxes,
  Building2,
  Crown,
  Download,
  Heart,
  Loader2,
  MoreVertical,
  Package,
  Plus,
  Settings,
  Users as UsersIcon,
  X,
} from "lucide-react";

type Org = {
  id: string;
  slug: string;
  name: string;
  description: string;
  avatar_url: string | null;
  created_at: string;
};

type Member = {
  user_id: string;
  role: "owner" | "admin" | "member";
  profile: { id: string; display_name: string | null; mc_username: string | null; avatar_url: string | null } | null;
};

type Project = {
  kind: "mod" | "plugin";
  id: string;
  name: string;
  slug?: string;
  short_id: string;
  description: string | null;
  icon_url: string | null;
  category: string | null;
  tags?: string[];
  loader?: string | null;
  platform?: string | null;
  updated_at?: string | null;
  likes?: number;
  downloads?: number;
};

const timeAgo = (iso: string | null | undefined) => {
  if (!iso) return "recently";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "moments ago";
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)} minutes ago`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)} hours ago`;
  const d = h / 24;
  if (d < 30) return `${Math.floor(d)} days ago`;
  const mo = d / 30;
  if (mo < 12) return `${Math.floor(mo)} month${Math.floor(mo) === 1 ? "" : "s"} ago`;
  const y = Math.floor(d / 365);
  return `${y} year${y === 1 ? "" : "s"} ago`;
};

export default function OrgProfile() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [org, setOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [attachOpen, setAttachOpen] = useState(false);
  const [attachLoading, setAttachLoading] = useState(false);
  const [attachable, setAttachable] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [attaching, setAttaching] = useState(false);

  const loadProjects = async (orgId: string) => {
    const [{ data: mods }, { data: plugins }] = await Promise.all([
      (supabase.from("mods" as any) as any)
        .select("id, slug, short_id, name, description, icon_url, category, tags, loader, updated_at")
        .eq("org_id", orgId)
        .eq("published", true),
      (supabase.from("plugins" as any) as any)
        .select("id, short_id, name, description, icon_url, category, tags, platform, updated_at")
        .eq("org_id", orgId)
        .eq("published", true),
    ]);
    const modIds = ((mods ?? []) as any[]).map((m) => m.id);
    let likesByMod: Record<string, number> = {};
    if (modIds.length) {
      const { data: likes } = await (supabase as any).rpc("get_mod_like_counts", { _mod_ids: modIds });
      for (const l of (likes ?? []) as { mod_id: string; likes: number }[]) {
        likesByMod[l.mod_id] = Number(l.likes) || 0;
      }
    }

    setProjects([
      ...((mods ?? []) as any[]).map((m) => ({
        kind: "mod" as const, ...m, likes: likesByMod[m.id] ?? 0, downloads: 0,
      })),
      ...((plugins ?? []) as any[]).map((p) => ({
        kind: "plugin" as const, ...p, likes: 0, downloads: 0,
      })),
    ]);
  };

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      setNotFound(false);
      const { data: oRaw } = await (supabase.from("organizations_public" as any) as any)
        .select("id, slug, name, description, avatar_url, created_at")
        .eq("slug", slug.toLowerCase())
        .maybeSingle();
      const o = oRaw as Org | null;
      if (!o) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setOrg(o);
      document.title = `${o.name} — Warden Network`;

      const { data: m } = await supabase
        .from("organization_members")
        .select("user_id, role")
        .eq("org_id", o.id);
      const ids = (m ?? []).map((x) => x.user_id);
      const { data: profs } = ids.length
        ? await supabase
            .from("profiles")
            .select("id, display_name, mc_username, avatar_url")
            .in("id", ids)
        : { data: [] as any[] };
      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      setMembers(
        (m ?? []).map((x: any) => ({
          user_id: x.user_id,
          role: x.role,
          profile: profMap.get(x.user_id) ?? null,
        }))
      );

      if (user) {
        const { data: ownerFlag } = await supabase.rpc("is_org_owner", { _org_id: o.id });
        setIsOwner(!!ownerFlag);
      } else {
        setIsOwner(false);
      }

      await loadProjects(o.id);
      setLoading(false);
    })();
  }, [slug, user]);

  const openAttach = async () => {
    if (!user || !org) return;
    setAttachOpen(true);
    setSelected(new Set());
    setAttachLoading(true);
    const { data: prof } = await supabase
      .from("profiles")
      .select("display_name, mc_username")
      .eq("id", user.id)
      .maybeSingle();
    const authorNames = [prof?.display_name, prof?.mc_username].filter(Boolean) as string[];
    if (authorNames.length === 0) {
      setAttachable([]);
      setAttachLoading(false);
      return;
    }
    const [{ data: mods }, { data: plugins }] = await Promise.all([
      (supabase.from("mods" as any) as any)
        .select("id, slug, short_id, name, description, icon_url, category, org_id")
        .in("author", authorNames),
      (supabase.from("plugins" as any) as any)
        .select("id, short_id, name, description, icon_url, category, org_id")
        .in("author", authorNames),
    ]);
    const list: Project[] = [
      ...((mods ?? []) as any[]).filter((m) => !m.org_id).map((m) => ({ kind: "mod" as const, ...m })),
      ...((plugins ?? []) as any[]).filter((p) => !p.org_id).map((p) => ({ kind: "plugin" as const, ...p })),
    ];
    setAttachable(list);
    setAttachLoading(false);
  };

  const toggle = (key: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const attach = async () => {
    if (!org || selected.size === 0) return;
    setAttaching(true);
    const modIds: string[] = [];
    const pluginIds: string[] = [];
    for (const key of selected) {
      const [kind, id] = key.split(":");
      if (kind === "mod") modIds.push(id);
      else pluginIds.push(id);
    }
    let err: string | null = null;
    if (modIds.length) {
      const { error } = await (supabase.from("mods" as any) as any).update({ org_id: org.id }).in("id", modIds);
      if (error) err = error.message;
    }
    if (pluginIds.length) {
      const { error } = await (supabase.from("plugins" as any) as any).update({ org_id: org.id }).in("id", pluginIds);
      if (error) err = error.message;
    }
    setAttaching(false);
    if (err) return toast.error(err);
    toast.success("Projects added");
    setAttachOpen(false);
    await loadProjects(org.id);
  };

  const detach = async (p: Project) => {
    if (!org) return;
    const table = p.kind === "mod" ? "mods" : "plugins";
    const { error } = await (supabase.from(table as any) as any).update({ org_id: null }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Removed from organization");
    await loadProjects(org.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || !org) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-16 max-w-2xl text-center">
          <h1 className="text-3xl font-display font-bold">Organization not found</h1>
          <p className="text-muted-foreground mt-2">No organization exists at /org/{slug}.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const initials = org.name.slice(0, 2).toUpperCase();
  const totalDownloads = projects.reduce((acc, p) => acc + (p.downloads ?? 0), 0);
  const sortedMembers = [...members].sort((a, b) => {
    const order = { owner: 0, admin: 1, member: 2 } as const;
    return order[a.role] - order[b.role];
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-16 max-w-6xl">
        {/* Header */}
        <div className="flex items-start gap-5 flex-wrap">
          <Avatar className="h-24 w-24 rounded-md border border-border shrink-0">
            <AvatarImage src={org.avatar_url ?? undefined} className="object-cover" />
            <AvatarFallback className="rounded-md text-2xl">
              <Boxes className="h-10 w-10 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl md:text-4xl font-display font-bold leading-tight">{org.name}</h1>
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" /> Organization
              </span>
            </div>
            {org.description && (
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{org.description}</p>
            )}

            <div className="flex items-center gap-5 mt-3 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <UsersIcon className="h-4 w-4" />
                <strong className="text-foreground">{members.length}</strong>{" "}
                member{members.length === 1 ? "" : "s"}
              </span>
              <span className="flex items-center gap-1.5">
                <Package className="h-4 w-4" />
                <strong className="text-foreground">{projects.length}</strong>{" "}
                project{projects.length === 1 ? "" : "s"}
              </span>
              <span className="flex items-center gap-1.5">
                <Download className="h-4 w-4" />
                <strong className="text-foreground">{totalDownloads}</strong>{" "}
                download{totalDownloads === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isOwner && (
              <Button asChild variant="outline" size="sm">
                <Link to={`/org/${org.slug}/settings`}>
                  <Settings className="h-4 w-4 mr-1.5" /> Manage
                </Link>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="More">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(window.location.href);
                      toast.success("Link copied");
                    } catch {
                      toast.error("Could not copy link");
                    }
                  }}
                >
                  Copy link
                </DropdownMenuItem>
                {isOwner && (
                  <DropdownMenuItem onClick={openAttach}>
                    <Plus className="h-4 w-4 mr-2" /> Add projects
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="border-b border-border mt-6" />

        {/* Body: projects + members sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 mt-6">
          <div className="space-y-3">
            {isOwner && projects.length > 0 && (
              <div className="flex justify-end">
                <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" onClick={openAttach}>
                      <Plus className="h-4 w-4 mr-1" /> Add projects
                    </Button>
                  </DialogTrigger>
                  <AttachDialogContent
                    attachLoading={attachLoading}
                    attachable={attachable}
                    selected={selected}
                    toggle={toggle}
                    attach={attach}
                    attaching={attaching}
                    onCancel={() => setAttachOpen(false)}
                    orgName={org.name}
                  />
                </Dialog>
              </div>
            )}

            {projects.length === 0 ? (
              <Card className="p-10 text-center">
                <Boxes className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h2 className="font-bold text-lg mb-1">No projects yet</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {isOwner
                    ? "Add your mods or plugins to this organization."
                    : "This organization hasn't published any projects."}
                </p>
                {isOwner && (
                  <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={openAttach}>
                        <Plus className="h-4 w-4 mr-1" /> Add projects
                      </Button>
                    </DialogTrigger>
                    <AttachDialogContent
                      attachLoading={attachLoading}
                      attachable={attachable}
                      selected={selected}
                      toggle={toggle}
                      attach={attach}
                      attaching={attaching}
                      onCancel={() => setAttachOpen(false)}
                      orgName={org.name}
                    />
                  </Dialog>
                )}
              </Card>
            ) : (
              projects.map((p) => {
                const href = p.kind === "mod" ? `/mod/${p.slug}` : `/plugin/${p.short_id}`;
                const tagPills = [p.category, ...(p.tags ?? [])].filter(Boolean).slice(0, 3) as string[];
                const platform = p.loader ?? p.platform ?? null;
                return (
                  <div key={`${p.kind}-${p.id}`} className="group relative">
                    <Link to={href}>
                      <Card className="p-4 hover:border-primary/50 transition-colors">
                        <div className="flex items-start gap-4">
                          {p.icon_url ? (
                            <img
                              src={p.icon_url}
                              alt=""
                              className="h-16 w-16 rounded-md object-cover border border-border bg-card shrink-0"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-md bg-muted border border-border flex items-center justify-center shrink-0">
                              <Boxes className="h-7 w-7 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-base truncate">{p.name}</h3>
                            {p.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              {tagPills.map((t) => (
                                <Badge key={t} variant="secondary" className="rounded-full text-xs font-normal">
                                  {t}
                                </Badge>
                              ))}
                              {platform && (
                                <Badge variant="outline" className="rounded-full text-xs font-normal text-primary border-primary/40">
                                  {platform}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right text-sm text-muted-foreground shrink-0 space-y-1.5">
                            <div className="flex items-center justify-end gap-3">
                              <span className="flex items-center gap-1">
                                <Download className="h-3.5 w-3.5" /> {p.downloads ?? 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="h-3.5 w-3.5" /> {p.likes ?? 0}
                              </span>
                            </div>
                            <div className="text-xs">{timeAgo(p.updated_at)}</div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                    {isOwner && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.preventDefault();
                          detach(p);
                        }}
                        aria-label="Remove from organization"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <aside className="space-y-4">
            <Card className="p-5">
              <h3 className="font-bold mb-3">Members</h3>
              {sortedMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No members yet.</p>
              ) : (
                <ul className="space-y-3">
                  {sortedMembers.map((m) => {
                    const p = m.profile;
                    const name = p?.display_name || p?.mc_username || m.user_id.slice(0, 8);
                    const initials = name.slice(0, 2).toUpperCase();
                    const path = p
                      ? userProfilePath({ id: p.id, display_name: p.display_name, mc_username: p.mc_username })
                      : `/user/${m.user_id.slice(0, 8)}`;
                    return (
                      <li key={m.user_id}>
                        <Link
                          to={path}
                          className="flex items-center gap-3 rounded-md p-2 -mx-2 hover:bg-muted transition-colors"
                        >
                          <Avatar className="h-9 w-9 rounded-md">
                            <AvatarImage
                              src={p?.avatar_url ?? (p?.mc_username ? `https://mc-heads.net/avatar/${p.mc_username}/64` : undefined)}
                              className="object-cover"
                            />
                            <AvatarFallback className="rounded-md text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm truncate flex items-center gap-1">
                              {name}
                              {m.role === "owner" && (
                                <Crown className="h-3.5 w-3.5 text-amber-400" aria-label="Owner" />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground capitalize">{m.role}</div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function AttachDialogContent({
  attachLoading, attachable, selected, toggle, attach, attaching, onCancel, orgName,
}: {
  attachLoading: boolean;
  attachable: Project[];
  selected: Set<string>;
  toggle: (k: string) => void;
  attach: () => void;
  attaching: boolean;
  onCancel: () => void;
  orgName: string;
}) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add mods or plugins</DialogTitle>
        <DialogDescription>
          Select your unassigned projects to attach to <strong>{orgName}</strong>.
        </DialogDescription>
      </DialogHeader>
      {attachLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : attachable.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          No unassigned mods or plugins authored by you were found. Projects must list your display name or Minecraft username as the author.
        </p>
      ) : (
        <ul className="max-h-80 overflow-y-auto divide-y divide-border -mx-2">
          {attachable.map((p) => {
            const key = `${p.kind}:${p.id}`;
            return (
              <li key={key} className="flex items-center gap-3 px-2 py-2">
                <Checkbox checked={selected.has(key)} onCheckedChange={() => toggle(key)} id={key} />
                <label htmlFor={key} className="flex items-center gap-3 flex-1 cursor-pointer min-w-0">
                  {p.icon_url ? (
                    <img src={p.icon_url} alt="" className="h-9 w-9 rounded object-cover border border-border" />
                  ) : (
                    <div className="h-9 w-9 rounded bg-muted border border-border flex items-center justify-center">
                      <Boxes className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{p.kind}</div>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={attaching}>
          Cancel
        </Button>
        <Button onClick={attach} disabled={attaching || selected.size === 0}>
          {attaching && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Add {selected.size > 0 ? `(${selected.size})` : ""}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
