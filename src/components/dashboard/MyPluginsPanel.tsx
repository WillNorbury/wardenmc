import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Puzzle,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  X,
  Search,
  History,
} from "lucide-react";
import PluginVersionsDialog from "./PluginVersionsDialog";
import { MultiTagInput } from "@/components/ui/multi-tag-input";
import { McVersionSelect } from "./McVersionSelect";
import { MC_VERSIONS } from "@/lib/plugin-directory";
import FoliaBadge, { supportsFolia } from "@/components/site/FoliaBadge";
import { confirm } from "@/lib/confirm";


type Plugin = {
  id: string;
  short_id: string;
  slug: string | null;
  name: string;
  description: string | null;
  long_description: string | null;
  version: string | null;
  platform: string | null;
  platforms: string[] | null;
  mc_versions: string[] | null;
  category: string | null;
  tags: string[];
  icon_url: string | null;
  download_url: string | null;
  jar_path: string | null;
  jar_filename: string | null;
  jar_size: number | null;
  screenshots: string[];
  published: boolean;
  price: number | null;
  org_id: string | null;
};

type FormState = {
  id: string | null;
  name: string;
  slug: string;
  description: string;
  long_description: string;
  version: string;
  platforms: string[];
  mc_versions: string[];
  category: string;
  tags: string;
  icon_url: string;
  download_url: string;
  jar_path: string | null;
  jar_filename: string | null;
  jar_size: number | null;
  screenshots: string[];
  published: boolean;
  pricing: "free" | "paid";
  price: string;
  org_id: string | null;
};

const EMPTY: FormState = {
  id: null,
  name: "",
  slug: "",
  description: "",
  long_description: "",
  version: "",
  platforms: ["paper"],
  mc_versions: [],
  category: "",
  tags: "",
  icon_url: "",
  download_url: "",
  jar_path: null,
  jar_filename: null,
  jar_size: null,
  screenshots: [],
  published: true,
  pricing: "free",
  price: "0",
  org_id: null,
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const PLATFORMS = ["paper", "spigot", "bukkit", "folia", "purpur", "velocity", "bungeecord"];
const MC_VERSIONS_SUGGEST = [...MC_VERSIONS];

const pluginPlatforms = (p: Plugin): string[] =>
  p.platforms && p.platforms.length ? p.platforms : p.platform ? [p.platform] : [];


export default function MyPluginsPanel({ userId }: { userId: string }) {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploadingJar, setUploadingJar] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingShots, setUploadingShots] = useState(false);
  const jarRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<HTMLInputElement>(null);
  const shotsRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [versionFilter, setVersionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [versionsFor, setVersionsFor] = useState<Plugin | null>(null);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);


  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("plugins")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    setPlugins((data ?? []) as Plugin[]);
    setLoading(false);
  };

  const loadOrgs = async () => {
    const { data } = await supabase.rpc("get_my_organizations");
    setOrgs((data ?? []) as { id: string; name: string }[]);
  };

  useEffect(() => {
    load();
    loadOrgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const openNew = () => {
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (p: Plugin) => {
    setForm({
      id: p.id,
      name: p.name,
      slug: p.slug ?? "",
      description: p.description ?? "",
      long_description: p.long_description ?? "",
      version: p.version ?? "",
      platforms: p.platforms && p.platforms.length ? p.platforms : p.platform ? [p.platform] : [],
      mc_versions: p.mc_versions ?? [],
      category: p.category ?? "",
      tags: (p.tags ?? []).join(", "),
      icon_url: p.icon_url ?? "",
      download_url: p.download_url ?? "",
      jar_path: p.jar_path,
      jar_filename: p.jar_filename,
      jar_size: p.jar_size,
      screenshots: p.screenshots ?? [],
      published: p.published,
      pricing: (p.price ?? 0) > 0 ? "paid" : "free",
      price: p.price != null ? String(p.price) : "0",
      org_id: p.org_id ?? null,
    });
    setOpen(true);
  };


  const uploadJar = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".jar")) {
      toast.error("Only .jar files are allowed");
      return;
    }
    setUploadingJar(true);
    const path = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("plugin-jars").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: "application/java-archive",
    });
    if (error) {
      toast.error(error.message);
      setUploadingJar(false);
      return;
    }
    setForm((f) => ({
      ...f,
      jar_path: path,
      jar_filename: file.name,
      jar_size: file.size,
      download_url: "",
    }));
    setUploadingJar(false);
    toast.success("Jar uploaded");
  };

  const uploadIcon = async (file: File) => {
    setUploadingIcon(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${userId}/icons/${Date.now()}.${ext}`;
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
    setForm((f) => ({ ...f, icon_url: pub.publicUrl }));
    setUploadingIcon(false);
  };

  const uploadShots = async (files: FileList) => {
    setUploadingShots(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() || "png";
      const path = `${userId}/shots/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("plugin-screenshots").upload(path, file);
      if (error) {
        toast.error(error.message);
        continue;
      }
      const { data: pub } = supabase.storage.from("plugin-screenshots").getPublicUrl(path);
      urls.push(pub.publicUrl);
    }
    if (urls.length) setForm((f) => ({ ...f, screenshots: [...f.screenshots, ...urls] }));
    setUploadingShots(false);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const cleanSlug = slugify(form.slug);
    if (form.slug.trim() && !cleanSlug) {
      toast.error("Slug must contain letters or numbers");
      setSaving(false);
      return;
    }
    const payload = {
      name: form.name.trim(),
      slug: cleanSlug || null,
      description: form.description.trim() || null,
      long_description: form.long_description.trim() || null,
      version: form.version.trim() || null,
      platforms: form.platforms,
      platform: form.platforms[0] ?? null,
      mc_versions: form.mc_versions,
      category: form.category.trim() || null,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      icon_url: form.icon_url.trim() || null,
      download_url: form.download_url.trim() || null,
      jar_path: form.jar_path,
      jar_filename: form.jar_filename,
      jar_size: form.jar_size,
      screenshots: form.screenshots,
      published: form.published,
      price: form.pricing === "paid" ? Math.max(0, Number(form.price) || 0) : 0,
      org_id: form.org_id,
    };

    let error;
    if (form.id) {
      ({ error } = await supabase.from("plugins").update(payload).eq("id", form.id));
    } else {
      ({ error } = await supabase.from("plugins").insert({ ...payload, user_id: userId }));
    }
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(form.id ? "Plugin updated" : "Plugin created");
    setOpen(false);
    setForm(EMPTY);
    load();
  };

  const remove = async (p: Plugin) => {
    if (!(await confirm(`Delete "${p.name}"? This cannot be undone.`))) return;
    const { error } = await supabase.from("plugins").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Plugin deleted");
    load();
  };

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Puzzle className="h-5 w-5 text-primary" />
          <h2 className="font-display font-bold text-lg">Plugins</h2>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> New plugin
        </Button>
      </div>

      {plugins.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto] mb-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="pl-8 h-9"
            />
          </div>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Platform" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {Array.from(new Set(plugins.flatMap((p) => pluginPlatforms(p)))).map((p) => (
                <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={versionFilter} onValueChange={setVersionFilter}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Version" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All versions</SelectItem>
              {Array.from(new Set(plugins.map((p) => p.version).filter(Boolean))).map((v) => (
                <SelectItem key={v as string} value={v as string}>v{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : plugins.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You haven't published any plugins yet. Click "New plugin" to get started.
        </p>
      ) : (() => {
        const q = search.trim().toLowerCase();
        const filtered = plugins.filter((p) => {
          if (q && !p.name.toLowerCase().includes(q)) return false;
          if (platformFilter !== "all" && !pluginPlatforms(p).includes(platformFilter)) return false;
          if (versionFilter !== "all" && p.version !== versionFilter) return false;
          if (statusFilter === "published" && !p.published) return false;
          if (statusFilter === "draft" && p.published) return false;
          return true;
        });
        if (filtered.length === 0) {
          return <p className="text-sm text-muted-foreground">No plugins match your filters.</p>;
        }
        return (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border/60"
            >
              {p.icon_url ? (
                <img
                  src={p.icon_url}
                  alt=""
                  className="h-10 w-10 rounded-md object-cover border border-border shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                  <Puzzle className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-bold truncate">{p.name}</span>
                  {!p.published && (
                    <Badge variant="outline" className="text-amber-400 border-amber-400/40">
                      Draft
                    </Badge>
                  )}
                  {p.version && <span className="text-xs text-muted-foreground">v{p.version}</span>}
                  {pluginPlatforms(p).map((pl) => (
                    <Badge key={pl} variant="secondary" className="capitalize">
                      {pl}
                    </Badge>
                  ))}
                  {supportsFolia(pluginPlatforms(p), p.tags) && <FoliaBadge />}

                </div>
                {p.description && (
                  <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {p.description}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {p.published && (
                  <Button asChild size="icon" variant="ghost" aria-label="View">
                    <Link to={`/plugins/${p.slug ?? p.short_id}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
                <Button size="icon" variant="ghost" onClick={() => setVersionsFor(p)} aria-label="Versions" title="Manage versions">
                  <History className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => openEdit(p)} aria-label="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(p)}
                  aria-label="Delete"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        );
      })()}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit plugin" : "New plugin"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="p-name">Name *</Label>
                <Input
                  id="p-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={80}
                  placeholder="MyAwesomePlugin"
                />
              </div>
              <div>
                <Label htmlFor="p-version">Version</Label>
                <Input
                  id="p-version"
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                  maxLength={32}
                  placeholder="1.0.0"
                />
              </div>
            </div>

            <div className="rounded-md border border-border p-3">
              <Label className="mb-2 block">Pricing *</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, pricing: "free", price: "0" })}
                  className={`rounded-md border p-3 text-left transition ${form.pricing === "free" ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
                >
                  <div className="font-display font-bold text-sm">Free</div>
                  <div className="text-xs text-muted-foreground">Anyone can download at no cost.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, pricing: "paid" })}
                  className={`rounded-md border p-3 text-left transition ${form.pricing === "paid" ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
                >
                  <div className="font-display font-bold text-sm">Paid</div>
                  <div className="text-xs text-muted-foreground">Users must purchase to download.</div>
                </button>
              </div>
              {form.pricing === "paid" && (
                <div className="mt-3 grid sm:grid-cols-[160px_1fr] gap-3 items-end">
                  <div>
                    <Label htmlFor="p-price">Price (USD) *</Label>
                    <Input
                      id="p-price"
                      inputMode="decimal"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="4.99"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Buyers will be charged this amount at checkout.</p>
                </div>
              )}
            </div>


            <div>
              <Label htmlFor="p-slug">URL slug</Label>
              <Input
                id="p-slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                onBlur={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                maxLength={80}
                placeholder="my-awesome-plugin"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used in the URL: /plugins/<span className="font-mono">{slugify(form.slug) || "auto-generated"}</span>. Leave blank to auto-generate from the name. Must be unique.
              </p>
            </div>

            <div>
              <Label htmlFor="p-desc">Short description</Label>
              <Input
                id="p-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={200}
                placeholder="One-line summary"
              />
            </div>

            <div>
              <Label htmlFor="p-long">Long description</Label>
              <Textarea
                id="p-long"
                rows={5}
                value={form.long_description}
                onChange={(e) => setForm({ ...form, long_description: e.target.value })}
                maxLength={4000}
                placeholder="Full description, features, configuration, etc."
              />
            </div>

            <div>
              <Label>Platforms</Label>
              <MultiTagInput
                values={form.platforms}
                onChange={(v) => setForm({ ...form, platforms: v })}
                placeholder="Add a platform (Paper, Folia...)"
                suggestions={PLATFORMS}
                capitalize
              />
            </div>

            <div>
              <Label>Minecraft versions</Label>
              <McVersionSelect
                values={form.mc_versions}
                onChange={(v) => setForm({ ...form, mc_versions: v })}
                options={[...MC_VERSIONS]}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="p-cat">Category</Label>
                <Input
                  id="p-cat"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  maxLength={40}
                  placeholder="Utility"
                />
              </div>
              <div>
                <Label htmlFor="p-tags">Tags (comma)</Label>
                <Input
                  id="p-tags"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="rtp, teleport"
                />
              </div>
            </div>

            <div>
              <Label>Organization</Label>
              <Select
                value={form.org_id ?? "none"}
                onValueChange={(v) => setForm({ ...form, org_id: v === "none" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Personal (no organization)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Personal (no organization)</SelectItem>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {orgs.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  You're not an owner of any organization yet. Create one from your profile first.
                </p>
              )}
            </div>




            <div>
              <Label>Icon</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.icon_url ? (
                  <img
                    src={form.icon_url}
                    alt=""
                    className="h-12 w-12 rounded-md object-cover border border-border"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-primary" />
                  </div>
                )}
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
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1" />
                  )}
                  Upload icon
                </Button>
                {form.icon_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setForm({ ...form, icon_url: "" })}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label>Jar file</Label>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <input
                  ref={jarRef}
                  type="file"
                  accept=".jar"
                  hidden
                  onChange={(e) => e.target.files?.[0] && uploadJar(e.target.files[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => jarRef.current?.click()}
                  disabled={uploadingJar}
                >
                  {uploadingJar ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1" />
                  )}
                  Upload .jar
                </Button>
                {form.jar_filename && (
                  <span className="text-xs text-muted-foreground">
                    {form.jar_filename}
                    {form.jar_size ? ` · ${(form.jar_size / 1024 / 1024).toFixed(2)} MB` : ""}
                  </span>
                )}
              </div>
            </div>

            <div>
              <Label>Screenshots</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {form.screenshots.map((url) => (
                  <div key={url} className="relative">
                    <img
                      src={url}
                      alt=""
                      className="h-16 w-24 object-cover rounded-md border border-border"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          screenshots: form.screenshots.filter((u) => u !== url),
                        })
                      }
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      aria-label="Remove screenshot"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <input
                ref={shotsRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => e.target.files && uploadShots(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => shotsRef.current?.click()}
                disabled={uploadingShots}
              >
                {uploadingShots ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                Add screenshots
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <div className="text-sm font-medium">Published</div>
                <div className="text-xs text-muted-foreground">
                  Make visible on the public plugins page
                </div>
              </div>
              <Switch
                checked={form.published}
                onCheckedChange={(v) => setForm({ ...form, published: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {form.id ? "Save changes" : "Create plugin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {versionsFor && (
        <PluginVersionsDialog
          open={!!versionsFor}
          onOpenChange={(v) => !v && setVersionsFor(null)}
          pluginId={versionsFor.id}
          pluginName={versionsFor.name}
          userId={userId}
          onChanged={load}
        />
      )}
    </Card>
  );
}

