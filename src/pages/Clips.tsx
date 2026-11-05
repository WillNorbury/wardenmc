import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Film, Upload, Search, Loader2, Trash2, Link2, Play } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import ClipPlayer from "@/components/site/ClipPlayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { CLIP_BUCKET, clipStoragePath, validateClip } from "@/lib/clips";

type Clip = { id: string; user_id: string; title: string; description: string; storage_path: string; created_at: string; url: string };

function ClipVideo({ clip, preview = false }: { clip: Clip; preview?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <div className="aspect-video w-full overflow-hidden bg-muted">
    {failed ? <p role="alert" className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">This video could not play. Try another browser or an MP4 version.</p> : <video key={clip.url} src={clip.url} controls={!preview} muted={preview} playsInline preload="metadata" aria-label={clip.title} className="h-full w-full object-contain" onError={() => setFailed(true)} />}
  </div>;
}

export default function Clips() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [mine, setMine] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteClip, setDeleteClip] = useState<Clip | null>(null);
  const [formError, setFormError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const selected = clips.find(clip => clip.id === params.get("clip"));

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data, error } = await supabase.from("community_clips").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      const ids = (data ?? []).map(clip => clip.id);
      if (!ids.length) { setClips([]); return; }
      const { data: links, error: urlError } = await supabase.functions.invoke("clip-playback-urls", { body: { clip_ids: ids } });
      if (urlError) throw urlError;
      const urls: Record<string, string> = links?.urls ?? {};
      const resolved = (data ?? []).map(clip => ({ ...clip, url: urls[clip.id] ?? "" }));
      setClips(resolved);
    } catch (err) { setError(err instanceof Error ? err.message : "Clips could not be loaded."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    document.title = "Community Clips — Warden Network";
    void load();
    const timer = window.setInterval(() => void load(), 50 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!user || uploading) return;
    if (!file) { setFormError("Choose a video to upload."); return; }
    const validation = validateClip(file, title);
    if (validation) { setFormError(validation); return; }
    setUploading(true); setFormError("");
    const path = clipStoragePath(user.id, crypto.randomUUID(), file.name);
    try {
      const { error: uploadError } = await supabase.storage.from(CLIP_BUCKET).upload(path, file, { contentType: file.type || "video/mp4", upsert: false });
      if (uploadError) throw uploadError;
      const { data, error: saveError } = await supabase.from("community_clips").insert({ user_id: user.id, title: title.trim(), description: description.trim(), storage_path: path }).select("id").single();
      if (saveError) { await supabase.storage.from(CLIP_BUCKET).remove([path]); throw saveError; }
      setUploadOpen(false); setTitle(""); setDescription(""); setFile(null);
      toast.success("Clip uploaded");
      await load(); setParams({ clip: data.id });
    } catch (err) { setFormError(err instanceof Error ? err.message : "Upload failed. Please try again."); }
    finally { setUploading(false); }
  }

  async function removeClip() {
    if (!deleteClip || user?.id !== deleteClip.user_id || deleting) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("community_clips").delete().eq("id", deleteClip.id).eq("user_id", user.id);
      if (error) throw error;
      const { error: storageError } = await supabase.storage.from(CLIP_BUCKET).remove([deleteClip.storage_path]);
      if (storageError) toast.error("Clip removed from the gallery, but its file could not be deleted.");
      else toast.success("Clip deleted");
      setDeleteClip(null); setParams({}); await load();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not delete clip."); }
    finally { setDeleting(false); }
  }

  const filtered = clips.filter(clip => (!mine || clip.user_id === user?.id) && `${clip.title} ${clip.description}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="flex min-h-screen flex-col"><Navbar />
    <main className="container flex-1 max-w-6xl pt-28 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-8">
        <div><div className="mb-3 flex items-center gap-2 text-primary"><Film className="h-5 w-5" /><span className="text-sm font-semibold uppercase">Community</span></div><h1 className="font-display text-4xl font-bold">Clips</h1></div>
        {user ? <Button onClick={() => setUploadOpen(true)}><Upload className="mr-2 h-4 w-4" />Upload clip</Button> : <Button asChild><Link to="/auth"><Upload className="mr-2 h-4 w-4" />Sign in to upload</Link></Button>}
      </header>
      <div className="my-6 flex flex-wrap items-center gap-3"><div className="relative w-full max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search clips…" aria-label="Search clips" value={query} onChange={e => setQuery(e.target.value)} /></div>{user && <div className="flex gap-2"><Button variant={mine ? "ghost" : "secondary"} onClick={() => setMine(false)}>All clips</Button><Button variant={mine ? "secondary" : "ghost"} onClick={() => setMine(true)}>My clips</Button></div>}</div>
      {loading ? <div className="py-16 text-center" role="status"><Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" /><p className="mt-3 text-muted-foreground">Loading clips…</p></div> : error ? <div role="alert" className="py-10"><p className="text-destructive">{error}</p><Button className="mt-4" variant="outline" onClick={() => void load()}>Try again</Button></div> : filtered.length ? <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{filtered.map(clip => <article key={clip.id} className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="relative"><ClipVideo clip={clip} preview /><Button aria-label={`Watch ${clip.title}`} variant="secondary" size="icon" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" onClick={() => setParams({ clip: clip.id })}><Play className="h-5 w-5" /></Button></div>
        <div className="p-4"><h2 className="break-words font-display text-lg font-semibold">{clip.title}</h2><p className="mt-1 text-xs text-muted-foreground">{new Date(clip.created_at).toLocaleDateString()}</p>{clip.description && <p className="mt-3 line-clamp-2 break-words text-sm text-muted-foreground">{clip.description}</p>}<div className="mt-4 flex justify-between gap-2"><Button variant="outline" size="sm" onClick={() => setParams({ clip: clip.id })}><Play className="mr-2 h-3 w-3" />Watch</Button>{user?.id === clip.user_id && <Button variant="ghost" size="icon" aria-label={`Delete ${clip.title}`} onClick={() => setDeleteClip(clip)}><Trash2 className="h-4 w-4" /></Button>}</div></div>
      </article>)}</div> : <div className="py-20 text-center"><Film className="mx-auto h-12 w-12 text-primary" /><h2 className="mt-5 font-display text-xl font-semibold">{query || mine ? "No matching clips" : "No clips yet"}</h2></div>}
      {!loading && !error && params.get("clip") && !selected && <p className="mt-4 text-muted-foreground">This clip is no longer available.</p>}
    </main><Footer />
    <Dialog open={uploadOpen} onOpenChange={open => { if (!uploading) { setUploadOpen(open); setFormError(""); } }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Upload clip</DialogTitle></DialogHeader><form onSubmit={upload} className="space-y-5"><div><Label htmlFor="clip-title">Title</Label><Input id="clip-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} required disabled={uploading} /></div><div><Label htmlFor="clip-description">Description (optional)</Label><Textarea id="clip-description" value={description} onChange={e => setDescription(e.target.value)} maxLength={1000} disabled={uploading} /></div><div><Label htmlFor="clip-file">Video</Label><Input ref={fileRef} id="clip-file" type="file" accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime" onChange={e => setFile(e.target.files?.[0] ?? null)} disabled={uploading} className="mt-2" /><p className="mt-2 text-xs text-muted-foreground">MP4, WebM or MOV · Up to 50 MB · Public clip</p></div>{formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}<Button type="submit" disabled={uploading} className="w-full">{uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}{uploading ? "Uploading…" : "Publish clip"}</Button></form></DialogContent></Dialog>
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setParams({}); }}><DialogContent className="w-[calc(100%-1rem)] max-w-5xl max-h-[90dvh] gap-0 overflow-y-auto overflow-x-hidden rounded-lg p-0 [&>button]:bg-background/90"><DialogHeader className="px-5 py-4 text-left"><span className="text-xs font-semibold uppercase text-primary">Community clips</span><DialogTitle className="break-words pr-8 text-xl">{selected?.title}</DialogTitle></DialogHeader>{selected && <><ClipPlayer key={selected.url} src={selected.url} title={selected.title} /><div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><p className="text-xs text-muted-foreground">{new Date(selected.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</p><Button variant="outline" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/clips?clip=${selected.id}`); toast.success("Clip link copied"); } catch { toast.error("Could not copy the link."); } }}><Link2 className="h-4 w-4" />Copy link</Button></div>{selected.description && <p className="whitespace-pre-wrap break-words border-t border-border px-5 py-4 text-sm text-muted-foreground">{selected.description}</p>}</>}</DialogContent></Dialog>
    <Dialog open={!!deleteClip} onOpenChange={open => { if (!open && !deleting) setDeleteClip(null); }}><DialogContent><DialogHeader><DialogTitle>Delete clip?</DialogTitle></DialogHeader><p className="break-words text-muted-foreground">{deleteClip?.title}</p><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDeleteClip(null)} disabled={deleting}>Cancel</Button><Button variant="destructive" onClick={() => void removeClip()} disabled={deleting}>{deleting ? "Deleting…" : "Delete clip"}</Button></div></DialogContent></Dialog>
  </div>;
}