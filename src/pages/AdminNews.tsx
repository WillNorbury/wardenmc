import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { confirm } from "@/lib/confirm";
import { Plus, Megaphone, ImagePlus, Pencil, Eye, EyeOff, Trash2, Send, ListChecks } from "lucide-react";
import { usePermissions } from "@/lib/usePermissions";
import { NewsDeliveryLogDialog } from "@/components/admin/NewsDeliveryLogDialog";

type Priority = "low" | "normal" | "high" | "urgent";

type News = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover_url: string | null;
  published: boolean;
  priority: Priority;
  created_at: string;
};

const priorityStyles: Record<Priority, string> = {
  low: "bg-muted text-muted-foreground border-border",
  normal: "bg-primary/15 text-primary border-primary/30",
  high: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  urgent: "bg-destructive/15 text-destructive border-destructive/30",
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) ||
  `post-${Date.now()}`;

export const NewsAnnouncementsTab = () => {
  const { user } = useAuth();

  const [items, setItems] = useState<News[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [logFor, setLogFor] = useState<News | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "Announcements — Admin · Warden Network";
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("news")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data ?? []) as News[]);
  };
  useEffect(() => {
    load();
  }, []);

  if (!user) return null;

  const resetForm = () => {
    setTitle("");
    setContent("");
    setPriority("normal");
    setCoverFile(null);
    setCoverPreview(null);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Cover must be an image");
      return;
    }
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  };

  const uploadCover = async (): Promise<string | null> => {
    if (!coverFile) return null;
    const ext = coverFile.name.split(".").pop() || "png";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("news-covers").upload(path, coverFile, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("news-covers").getPublicUrl(path);
    return data.publicUrl;
  };

  const submit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    const isEdit = !!editingId;
    const existing = isEdit ? items.find((i) => i.id === editingId) : null;
    if (!isEdit && !coverFile) {
      toast.error("Cover image is required");
      return;
    }
    setSaving(true);
    try {
      let cover_url = existing?.cover_url ?? null;
      if (coverFile) cover_url = await uploadCover();

      const payload = {
        title: title.trim(),
        slug: existing?.slug ?? slugify(title),
        excerpt: content.trim().slice(0, 180),
        content: content.trim(),
        cover_url,
        priority,
        published: existing?.published ?? true,
      };

      const { error } = isEdit
        ? await supabase.from("news").update(payload).eq("id", editingId!)
        : await supabase.from("news").insert(payload);
      if (error) throw error;
      toast.success(
        isEdit
          ? "Announcement updated"
          : "Announcement published — use the Send button to email subscribers",
      );

      resetForm();
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const sendEmail = async (n: News) => {
    if (!n.published) {
      toast.error("Publish the post first");
      return;
    }
    const ok = await confirm({
      title: "Send to all subscribers?",
      description: `Emails every user with a confirmed account about "${n.title}".`,
      confirmText: "Send",
    });
    if (!ok) return;
    const { data, error } = await supabase.functions.invoke("notify-news", {
      body: { newsId: n.id },
    });
    if (error || !(data as any)?.ok) {
      toast.error((data as any)?.error || error?.message || "Failed");
      return;
    }
    toast.success(`Emailed ${(data as any).queued}/${(data as any).total} subscribers`);
  };

  const startEdit = (n: News) => {
    setEditingId(n.id);
    setTitle(n.title);
    setContent(n.content);
    setPriority(n.priority);
    setCoverPreview(n.cover_url);
    setCoverFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const togglePublished = async (n: News) => {
    const { error } = await supabase
      .from("news")
      .update({ published: !n.published })
      .eq("id", n.id);
    if (error) return toast.error(error.message);
    toast.success(n.published ? "Hidden" : "Visible");
    load();
  };

  const remove = async (n: News) => {
    const ok = await confirm({
      title: "Delete announcement?",
      description: `"${n.title}" will be permanently removed.`,
      confirmText: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("news").delete().eq("id", n.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    if (editingId === n.id) resetForm();
    load();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-card/60 border-border/60">
        <div className="flex items-center gap-2 mb-5">
          <Plus className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{editingId ? "Edit Announcement" : "New Announcement"}</h2>
        </div>

        <div className="space-y-4">
          <Input
            placeholder="Announcement title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-background/40"
          />
          <Textarea
            placeholder="Write your announcement content..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            className="bg-background/40 resize-y"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files?.[0] ?? null);
            }}
            className={`rounded-lg border-2 border-dashed p-4 transition ${
              dragOver ? "border-primary bg-primary/5" : "border-border/60"
            }`}
          >
            <div className="flex items-center gap-2 mb-3 text-sm font-medium">
              <ImagePlus className="h-4 w-4 text-primary" />
              Cover Image {editingId ? "(optional — keep current)" : "(required)"}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-secondary file:text-foreground file:cursor-pointer bg-background/40 rounded-md border border-border/60 p-1"
            />
            <p className="text-xs text-muted-foreground mt-2">or drag and drop an image here</p>
            {coverPreview && (
              <img
                src={coverPreview}
                alt="cover preview"
                className="mt-3 rounded-md max-h-40 object-cover"
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger className="w-[140px] bg-background/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={submit} disabled={saving} className="gap-2">
              <Megaphone className="h-4 w-4" />
              {saving ? "Saving..." : editingId ? "Save changes" : "Publish"}
            </Button>
            {editingId && (
              <Button variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div>
        <h3 className="text-lg font-semibold mb-3">All Announcements ({items.length})</h3>
        <div className="space-y-3">
          {items.length === 0 && (
            <Card className="p-6 text-sm text-muted-foreground">No announcements yet.</Card>
          )}
          {items.map((n) => (
            <Card key={n.id} className="p-5 bg-card/60 border-border/60">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold truncate">{n.title}</h4>
                    <Badge variant="outline" className={priorityStyles[n.priority]}>
                      {n.priority}
                    </Badge>
                    {!n.published && (
                      <Badge variant="outline" className="bg-muted text-muted-foreground">
                        hidden
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                    {n.content}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => sendEmail(n)} title="Email to subscribers" disabled={!n.published}>
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setLogFor(n)} title="View delivery log">
                    <ListChecks className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => startEdit(n)} title="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => togglePublished(n)}
                    title={n.published ? "Hide" : "Show"}
                  >
                    {n.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(n)}
                    title="Delete"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <NewsDeliveryLogDialog
        open={!!logFor}
        onOpenChange={(v) => !v && setLogFor(null)}
        newsId={logFor?.id ?? null}
        newsTitle={logFor?.title}
      />
    </div>
  );
};

const AdminNews = () => {
  const { user, loading } = useAuth();
  const { roles, loading: permsLoading } = usePermissions();
  const isAdmin = ["admin", "owner", "founder", "star"].some((r) => roles.includes(r));
  const isOwner = roles.includes("owner");

  if (loading || permsLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <AdminLayout
      current="news"
      onNavigate={() => {}}
      title="Announcements"
      description="Publish news and announcements to your players."
      isOwner={isOwner}
    >
      <NewsAnnouncementsTab />
    </AdminLayout>
  );
};

export default AdminNews;
