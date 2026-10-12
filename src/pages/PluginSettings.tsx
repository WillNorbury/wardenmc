import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import PageLoader from "@/components/site/PageLoader";
import { supabase } from "@/integrations/supabase/client";
import { getJarDownloadUrl } from "@/lib/plugin-files";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { confirm } from "@/lib/confirm";
import {
  Info,
  Tag,
  AlignLeft,
  GitBranch,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Users,
  BarChart3,
  Upload,
  Trash2,
  LayoutGrid,
  Loader2,
  Puzzle,
  Plus,
  X,
  Download,
} from "lucide-react";

type Plugin = {
  id: string;
  short_id: string;
  slug: string | null;
  name: string;
  description: string | null;
  long_description: string | null;
  icon_url: string | null;
  published: boolean;
  user_id: string | null;
  org_id: string | null;
  category: string | null;
  tags: string[] | null;
  screenshots: string[] | null;
  license: string | null;
  website_url: string | null;
  source_url: string | null;
  issues_url: string | null;
  discord_url: string | null;
  version: string | null;
};

type PluginVersion = {
  id: string;
  plugin_id: string;
  version: string;
  changelog: string | null;
  jar_path: string | null;
  jar_filename: string | null;
  jar_size: number | null;
  download_url: string | null;
  created_at: string;
};

type Member = {
  id: string;
  user_id: string;
  role: string;
  display_name: string | null;
  avatar_url: string | null;
};

type Section =
  | "general"
  | "tags"
  | "description"
  | "versions"
  | "license"
  | "gallery"
  | "links"
  | "members"
  | "analytics";

const SECTIONS: { id: Section; label: string; icon: typeof Info }[] = [
  { id: "general", label: "General", icon: Info },
  { id: "tags", label: "Tags", icon: Tag },
  { id: "description", label: "Description", icon: AlignLeft },
  { id: "versions", label: "Versions", icon: GitBranch },
  { id: "license", label: "License", icon: FileText },
  { id: "gallery", label: "Gallery", icon: ImageIcon },
  { id: "links", label: "Links", icon: LinkIcon },
  { id: "members", label: "Members", icon: Users },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

const CATEGORIES = [
  "Admin Tools",
  "Anti-Griefing Tools",
  "Chat",
  "Developer Tools",
  "Economy",
  "Fun",
  "General",
  "Mechanics",
  "Miscellaneous",
  "Role Playing",
  "Teleportation",
  "Website",
  "World Editing",
  "World Generators",
];

const LICENSES = [
  "MIT",
  "Apache-2.0",
  "GPL-3.0",
  "LGPL-3.0",
  "BSD-3-Clause",
  "MPL-2.0",
  "All Rights Reserved",
  "Custom",
];

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const fmtBytes = (n: number | null) => {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const PluginSettings = () => {
  const { slug: key } = useParams();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [plugin, setPlugin] = useState<Plugin | null>(null);
  const [section, setSection] = useState<Section>("general");

  // general
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [published, setPublished] = useState(true);
  const [monetization, setMonetization] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const iconRef = useRef<HTMLInputElement>(null);

  // tags
  const [category, setCategory] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // description
  const [longDescription, setLongDescription] = useState("");

  // versions
  const [versions, setVersions] = useState<PluginVersion[]>([]);
  const [newVersion, setNewVersion] = useState("");
  const [newChangelog, setNewChangelog] = useState("");
  const [newJar, setNewJar] = useState<File | null>(null);
  const [addingVersion, setAddingVersion] = useState(false);
  const jarRef = useRef<HTMLInputElement>(null);

  // license
  const [license, setLicense] = useState<string>("");

  // gallery
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [uploadingShot, setUploadingShot] = useState(false);
  const shotRef = useRef<HTMLInputElement>(null);

  // links
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [issuesUrl, setIssuesUrl] = useState("");
  const [discordUrl, setDiscordUrl] = useState("");

  // members
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!key) return;
    (async () => {
      setLoading(true);
      let { data } = await supabase.from("plugins").select("*").eq("slug", key).maybeSingle();
      if (!data) {
        const fb = await supabase.from("plugins").select("*").eq("short_id", key).maybeSingle();
        data = fb.data;
      }
      if (data) {
        const p = data as unknown as Plugin;
        setPlugin(p);
        setName(p.name);
        setSlug(p.slug ?? "");
        setDescription(p.description ?? "");
        setIconUrl(p.icon_url);
        setPublished(p.published);
        setCategory(p.category ?? "");
        setTags(p.tags ?? []);
        setLongDescription(p.long_description ?? "");
        setLicense(p.license ?? "");
        setScreenshots(p.screenshots ?? []);
        setWebsiteUrl(p.website_url ?? "");
        setSourceUrl(p.source_url ?? "");
        setIssuesUrl(p.issues_url ?? "");
        setDiscordUrl(p.discord_url ?? "");
        document.title = `${p.name} — Settings — Warden Network`;

        // fetch versions
        const { data: vs } = await supabase
          .from("plugin_versions")
          .select("*")
          .eq("plugin_id", p.id)
          .order("created_at", { ascending: false });
        setVersions((vs as PluginVersion[]) ?? []);

        // fetch org members if org-owned
        if (p.org_id) {
          const { data: mm } = await supabase
            .from("organization_members")
            .select("id, user_id, role")
            .eq("org_id", p.org_id);
          const memberRows = (mm as any[]) ?? [];
          if (memberRows.length) {
            const ids = memberRows.map((m) => m.user_id);
            const { data: profs } = await supabase
              .from("profiles")
              .select("id, display_name, avatar_url")
              .in("id", ids);
            const profMap = new Map<string, any>();
            (profs as any[])?.forEach((pr) => profMap.set(pr.id, pr));
            setMembers(
              memberRows.map((m) => ({
                id: m.id,
                user_id: m.user_id,
                role: m.role,
                display_name: profMap.get(m.user_id)?.display_name ?? null,
                avatar_url: profMap.get(m.user_id)?.avatar_url ?? null,
              }))
            );
          }
        }
      }
      setLoading(false);
    })();
  }, [key]);

  if (authLoading || loading) return <PageLoader loading={true} />;

  if (!plugin) {
    return (
      <>
        <Navbar />
        <main className="container max-w-4xl py-16 text-center">
          <h1 className="font-display text-2xl font-bold mb-2">Plugin not found</h1>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/plugins">Browse plugins</Link>
          </Button>
        </main>
        <Footer />
      </>
    );
  }

  const isOwner = !!user && (plugin.user_id === user.id || isAdmin);

  if (!isOwner) {
    return (
      <>
        <Navbar />
        <main className="container max-w-4xl py-16 text-center">
          <h1 className="font-display text-2xl font-bold mb-2">Access denied</h1>
          <p className="text-muted-foreground">You don't have permission to edit this plugin.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to={`/plugin/${plugin.slug ?? plugin.short_id}`}>Back to plugin</Link>
          </Button>
        </main>
        <Footer />
      </>
    );
  }

  const updatePlugin = async (patch: Record<string, any>, successMsg = "Saved") => {
    setSaving(true);
    const { error } = await supabase.from("plugins").update(patch as any).eq("id", plugin.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    setPlugin({ ...plugin, ...patch });
    toast.success(successMsg);
    return true;
  };

  const uploadIcon = async (file: File) => {
    setUploadingIcon(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${plugin.user_id ?? user!.id}/icons/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("plugin-screenshots").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      toast.error(error.message);
      setUploadingIcon(false);
      return;
    }
    const { data: pub } = supabase.storage.from("plugin-screenshots").getPublicUrl(path);
    setIconUrl(pub.publicUrl);
    setUploadingIcon(false);
  };

  const saveGeneral = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const cleanSlug = slugify(slug);
    if (slug.trim() && !cleanSlug) {
      toast.error("URL slug must contain letters or numbers");
      return;
    }
    const ok = await updatePlugin({
      name: name.trim(),
      slug: cleanSlug || null,
      description: description.trim() || null,
      icon_url: iconUrl,
      published,
    });
    if (ok && cleanSlug && cleanSlug !== key) {
      navigate(`/plugin/${cleanSlug}/settings`, { replace: true });
    }
  };

  const deletePlugin = async () => {
    if (!(await confirm(`Delete "${plugin.name}"? This cannot be undone.`))) return;
    setDeleting(true);
    const { error } = await supabase.from("plugins").delete().eq("id", plugin.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Plugin deleted");
    navigate("/profile");
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    if (!t) return;
    if (tags.includes(t)) {
      setTagInput("");
      return;
    }
    if (tags.length >= 10) {
      toast.error("Max 10 tags");
      return;
    }
    setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const uploadScreenshot = async (file: File) => {
    setUploadingShot(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${plugin.user_id ?? user!.id}/${plugin.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("plugin-screenshots").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    setUploadingShot(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data: pub } = supabase.storage.from("plugin-screenshots").getPublicUrl(path);
    setScreenshots([...screenshots, pub.publicUrl]);
  };

  const removeScreenshot = (url: string) => setScreenshots(screenshots.filter((s) => s !== url));

  const addVersion = async () => {
    if (!newVersion.trim()) {
      toast.error("Version is required (e.g. 1.0.0)");
      return;
    }
    setAddingVersion(true);
    let jar_path: string | null = null;
    let jar_filename: string | null = null;
    let jar_size: number | null = null;
    let download_url: string | null = null;
    if (newJar) {
      const path = `${plugin.user_id ?? user!.id}/${plugin.id}/${Date.now()}-${newJar.name}`;
      const { error: upErr } = await supabase.storage.from("plugin-jars").upload(path, newJar, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) {
        toast.error(upErr.message);
        setAddingVersion(false);
        return;
      }
      jar_path = path;
      jar_filename = newJar.name;
      jar_size = newJar.size;
      download_url = null;
    }
    const { data, error } = await supabase
      .from("plugin_versions")
      .insert({
        plugin_id: plugin.id,
        version: newVersion.trim(),
        changelog: newChangelog.trim() || null,
        jar_path,
        jar_filename,
        jar_size,
        download_url,
        created_by: user!.id,
      })
      .select()
      .single();
    setAddingVersion(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setVersions([data as PluginVersion, ...versions]);
    // update plugin.version to latest
    await supabase.from("plugins").update({ version: newVersion.trim() }).eq("id", plugin.id);
    setNewVersion("");
    setNewChangelog("");
    setNewJar(null);
    if (jarRef.current) jarRef.current.value = "";
    toast.success("Version added");
  };

  const deleteVersion = async (v: PluginVersion) => {
    if (!(await confirm(`Delete version ${v.version}?`))) return;
    if (v.jar_path) {
      await supabase.storage.from("plugin-jars").remove([v.jar_path]);
    }
    const { error } = await supabase.from("plugin_versions").delete().eq("id", v.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setVersions(versions.filter((x) => x.id !== v.id));
    toast.success("Version deleted");
  };

  const pluginUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/plugin/${slug || plugin.short_id}`;

  return (
    <>
      <Navbar />
      <main className="container max-w-6xl py-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            {iconUrl ? (
              <img
                src={iconUrl}
                alt=""
                className="h-10 w-10 rounded-md object-cover border border-border shrink-0"
              />
            ) : (
              <div className="h-10 w-10 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                <Puzzle className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="flex items-center gap-2 min-w-0">
              <Link
                to={`/plugin/${plugin.slug ?? plugin.short_id}`}
                className="font-display font-bold text-lg truncate hover:text-primary transition-colors"
              >
                {plugin.name}
              </Link>
              <span className="text-muted-foreground">›</span>
              <span className="font-display font-bold text-lg">Settings</span>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/profile">
              <LayoutGrid className="h-4 w-4 mr-1.5" /> Your plugins
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          {/* Sidebar */}
          <Card className="p-2 h-fit">
            <nav className="flex flex-col gap-0.5">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                const active = section === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSection(s.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${
                      active
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {s.label}
                  </button>
                );
              })}
            </nav>
          </Card>

          {/* Content */}
          <div className="space-y-6 min-w-0">
            {section === "general" && (
              <>
                <Card className="p-6 space-y-5">
                  <h2 className="font-display font-bold text-xl">Project information</h2>

                  <div className="space-y-2">
                    <Label htmlFor="ps-name">Name</Label>
                    <Input
                      id="ps-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={120}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ps-slug">URL</Label>
                    <div className="flex items-center gap-1 rounded-md border border-input bg-background overflow-hidden">
                      <span className="pl-3 pr-1 text-sm text-muted-foreground whitespace-nowrap">
                        {(typeof window !== "undefined" ? window.location.origin : "")}/plugin/
                      </span>
                      <Input
                        id="ps-slug"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                        placeholder={plugin.short_id}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{pluginUrl}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ps-desc">Summary</Label>
                    <Textarea
                      id="ps-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="A short summary of your plugin"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Icon <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <div className="flex items-center gap-3 flex-wrap">
                      {iconUrl ? (
                        <img
                          src={iconUrl}
                          alt=""
                          className="h-20 w-20 rounded-md object-cover border border-border"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center">
                          <Puzzle className="h-8 w-8 text-primary" />
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        <input
                          ref={iconRef}
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => e.target.files?.[0] && uploadIcon(e.target.files[0])}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => iconRef.current?.click()}
                          disabled={uploadingIcon}
                        >
                          {uploadingIcon ? (
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-1.5" />
                          )}
                          Upload icon
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIconUrl(null)}
                          disabled={!iconUrl}
                        >
                          <Trash2 className="h-4 w-4 mr-1.5" /> Remove icon
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ps-vis">Visibility</Label>
                    <Select
                      value={published ? "public" : "draft"}
                      onValueChange={(v) => setPublished(v === "public")}
                    >
                      <SelectTrigger id="ps-vis">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-start justify-between gap-4 pt-2 border-t border-border/60">
                    <div>
                      <Label className="text-sm font-medium">Monetization</Label>
                      <p className="text-xs text-muted-foreground mt-1 max-w-prose">
                        When enabled, this project can earn revenue through the Warden Network Rewards
                        Program.
                      </p>
                    </div>
                    <Switch checked={monetization} onCheckedChange={setMonetization} />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button onClick={saveGeneral} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save changes
                    </Button>
                  </div>
                </Card>

                <Card className="p-6 border-destructive/40">
                  <h2 className="font-display font-bold text-xl mb-2">Delete project</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Removes your project from Warden Network's servers and search. This cannot be undone.
                  </p>
                  <Button variant="destructive" onClick={deletePlugin} disabled={deleting}>
                    {deleting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Delete project
                  </Button>
                </Card>
              </>
            )}

            {section === "tags" && (
              <Card className="p-6 space-y-5">
                <h2 className="font-display font-bold text-xl">Tags & category</h2>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category || undefined} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tags <span className="text-xs text-muted-foreground font-normal">(up to 10)</span></Label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <Badge key={t} variant="secondary" className="gap-1">
                        {t}
                        <button onClick={() => removeTag(t)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {tags.length === 0 && (
                      <p className="text-xs text-muted-foreground">No tags yet</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      placeholder="Add a tag and press Enter"
                    />
                    <Button type="button" variant="outline" onClick={addTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => updatePlugin({ category: category || null, tags })}
                    disabled={saving}
                  >
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save changes
                  </Button>
                </div>
              </Card>
            )}

            {section === "description" && (
              <Card className="p-6 space-y-5">
                <h2 className="font-display font-bold text-xl">Full description</h2>
                <p className="text-sm text-muted-foreground">
                  Markdown is supported. This is what shoppers see on your plugin page.
                </p>
                <Textarea
                  value={longDescription}
                  onChange={(e) => setLongDescription(e.target.value)}
                  rows={18}
                  className="font-mono text-sm"
                  placeholder="## Features&#10;- Feature one&#10;- Feature two&#10;&#10;## Setup&#10;..."
                />
                <div className="flex justify-end">
                  <Button
                    onClick={() => updatePlugin({ long_description: longDescription.trim() || null })}
                    disabled={saving}
                  >
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save changes
                  </Button>
                </div>
              </Card>
            )}

            {section === "versions" && (
              <>
                <Card className="p-6 space-y-4">
                  <h2 className="font-display font-bold text-xl">New version</h2>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <Input
                      value={newVersion}
                      onChange={(e) => setNewVersion(e.target.value)}
                      placeholder="1.0.0"
                    />
                    <input
                      ref={jarRef}
                      type="file"
                      accept=".jar,.zip"
                      hidden
                      onChange={(e) => setNewJar(e.target.files?.[0] ?? null)}
                    />
                    <Button type="button" variant="outline" onClick={() => jarRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-1.5" />
                      {newJar ? newJar.name : "Choose .jar"}
                    </Button>
                  </div>
                  <Textarea
                    value={newChangelog}
                    onChange={(e) => setNewChangelog(e.target.value)}
                    rows={4}
                    placeholder="What's new?"
                  />
                  <div className="flex justify-end">
                    <Button onClick={addVersion} disabled={addingVersion}>
                      {addingVersion ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Publish version
                    </Button>
                  </div>
                </Card>

                <Card className="p-6 space-y-3">
                  <h2 className="font-display font-bold text-xl">All versions ({versions.length})</h2>
                  {versions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No versions published yet.</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {versions.map((v) => (
                        <div key={v.id} className="py-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline">{v.version}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(v.created_at).toLocaleDateString()}
                              </span>
                              {v.jar_filename && (
                                <span className="text-xs text-muted-foreground">
                                  · {v.jar_filename} ({fmtBytes(v.jar_size)})
                                </span>
                              )}
                            </div>
                            {v.changelog && (
                              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                                {v.changelog}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {(v.jar_path || v.download_url) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Download"
                                onClick={async () => {
                                  const url = await getJarDownloadUrl(v.jar_path || v.download_url);
                                  if (!url) return toast.error("Could not create a download link");
                                  window.open(url, "_blank", "noopener");
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteVersion(v)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </>
            )}

            {section === "license" && (
              <Card className="p-6 space-y-5">
                <h2 className="font-display font-bold text-xl">License</h2>
                <p className="text-sm text-muted-foreground">
                  Pick a common license or enter a custom identifier.
                </p>
                <div className="space-y-2">
                  <Label>Preset</Label>
                  <Select value={license || undefined} onValueChange={setLicense}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a license" />
                    </SelectTrigger>
                    <SelectContent>
                      {LICENSES.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Custom identifier</Label>
                  <Input
                    value={license}
                    onChange={(e) => setLicense(e.target.value)}
                    placeholder="e.g. MIT, Proprietary"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() => updatePlugin({ license: license.trim() || null })}
                    disabled={saving}
                  >
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save changes
                  </Button>
                </div>
              </Card>
            )}

            {section === "gallery" && (
              <Card className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-xl">Gallery</h2>
                  <input
                    ref={shotRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => e.target.files?.[0] && uploadScreenshot(e.target.files[0])}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => shotRef.current?.click()}
                    disabled={uploadingShot}
                  >
                    {uploadingShot ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-1.5" />
                    )}
                    Upload image
                  </Button>
                </div>
                {screenshots.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No screenshots yet. Upload some to showcase your plugin.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {screenshots.map((url) => (
                      <div key={url} className="relative group">
                        <img
                          src={url}
                          alt=""
                          className="w-full aspect-video object-cover rounded-md border border-border"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeScreenshot(url)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    onClick={() => updatePlugin({ screenshots })}
                    disabled={saving}
                  >
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save changes
                  </Button>
                </div>
              </Card>
            )}

            {section === "links" && (
              <Card className="p-6 space-y-5">
                <h2 className="font-display font-bold text-xl">External links</h2>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Source code</Label>
                  <Input
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://github.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Issue tracker</Label>
                  <Input
                    value={issuesUrl}
                    onChange={(e) => setIssuesUrl(e.target.value)}
                    placeholder="https://github.com/.../issues"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discord</Label>
                  <Input
                    value={discordUrl}
                    onChange={(e) => setDiscordUrl(e.target.value)}
                    placeholder="https://discord.gg/..."
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() =>
                      updatePlugin({
                        website_url: websiteUrl.trim() || null,
                        source_url: sourceUrl.trim() || null,
                        issues_url: issuesUrl.trim() || null,
                        discord_url: discordUrl.trim() || null,
                      })
                    }
                    disabled={saving}
                  >
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save changes
                  </Button>
                </div>
              </Card>
            )}

            {section === "members" && (
              <Card className="p-6 space-y-5">
                <h2 className="font-display font-bold text-xl">Members</h2>
                {!plugin.org_id ? (
                  <div className="text-sm text-muted-foreground">
                    This project is owned by a personal account. To collaborate with others, transfer
                    it to an organization from your dashboard.
                  </div>
                ) : members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members yet.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {members.map((m) => (
                      <div key={m.id} className="py-3 flex items-center gap-3">
                        {m.avatar_url ? (
                          <img
                            src={m.avatar_url}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs">
                            {(m.display_name ?? "?").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {m.display_name ?? m.user_id.slice(0, 8)}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">{m.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Manage organization members from the organization page.
                </p>
              </Card>
            )}

            {section === "analytics" && (
              <Card className="p-6 space-y-5">
                <h2 className="font-display font-bold text-xl">Analytics</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-md border border-border p-4">
                    <div className="text-xs uppercase text-muted-foreground">Versions</div>
                    <div className="text-2xl font-bold mt-1">{versions.length}</div>
                  </div>
                  <div className="rounded-md border border-border p-4">
                    <div className="text-xs uppercase text-muted-foreground">Screenshots</div>
                    <div className="text-2xl font-bold mt-1">{screenshots.length}</div>
                  </div>
                  <div className="rounded-md border border-border p-4">
                    <div className="text-xs uppercase text-muted-foreground">Tags</div>
                    <div className="text-2xl font-bold mt-1">{tags.length}</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Detailed download and view analytics are coming soon.
                </p>
              </Card>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default PluginSettings;
