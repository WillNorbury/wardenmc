import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Handshake, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { userProfilePath } from "@/lib/userSlug";

type P = { id: string; display_name: string | null; mc_username: string | null; avatar_url: string | null };
type Row = { owner_id: string; affiliate_id: string };

const db = supabase as any;

export default function AffiliatesCard({ profileId, isOwn, viewerId }: { profileId: string; isOwn: boolean; viewerId?: string }) {
  const [affiliates, setAffiliates] = useState<P[]>([]);
  const [affiliatedWith, setAffiliatedWith] = useState<P[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await db.from("user_affiliates").select("owner_id, affiliate_id").or(`owner_id.eq.${profileId},affiliate_id.eq.${profileId}`);
    const rows = (data ?? []) as Row[];
    const ids = [...new Set(rows.flatMap((r) => [r.owner_id, r.affiliate_id]))].filter((id) => id !== profileId);
    const { data: ps } = ids.length
      ? await supabase.from("profiles").select("id, display_name, mc_username, avatar_url").in("id", ids)
      : { data: [] as P[] };
    const map = new Map(((ps ?? []) as P[]).map((p) => [p.id, p]));
    setAffiliates(rows.filter((r) => r.owner_id === profileId).map((r) => map.get(r.affiliate_id)).filter(Boolean) as P[]);
    setAffiliatedWith(rows.filter((r) => r.affiliate_id === profileId).map((r) => map.get(r.owner_id)).filter(Boolean) as P[]);
  };

  useEffect(() => { load(); }, [profileId]);

  const add = async () => {
    const q = name.trim();
    if (!q) return;
    setBusy(true);
    const { data: found } = await supabase
      .from("profiles")
      .select("id")
      .or(`display_name.ilike.${q},mc_username.ilike.${q}`)
      .limit(1);
    const target = (found ?? [])[0] as { id: string } | undefined;
    if (!target) { toast.error("No account found with that name"); setBusy(false); return; }
    if (target.id === profileId) { toast.error("You can't add yourself"); setBusy(false); return; }
    const { error } = await db.from("user_affiliates").insert({ owner_id: profileId, affiliate_id: target.id });
    setBusy(false);
    if (error) { toast.error(error.code === "23505" ? "Already an affiliate" : error.message); return; }
    setName("");
    toast.success("Affiliate added");
    load();
  };

  const remove = async (ownerId: string, affiliateId: string) => {
    const { error } = await db.from("user_affiliates").delete().eq("owner_id", ownerId).eq("affiliate_id", affiliateId);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const Item = ({ p, onRemove }: { p: P; onRemove?: () => void }) => {
    const label = p.display_name ?? p.mc_username ?? "Player";
    return (
      <li className="flex items-center gap-2">
        <Link to={userProfilePath(p as any)} className="flex flex-1 min-w-0 items-center gap-3 rounded-md p-2 -mx-2 hover:bg-muted transition-colors">
          <Avatar className="h-8 w-8"><AvatarImage src={p.avatar_url ?? undefined} /><AvatarFallback className="text-xs">{label.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
          <span className="font-semibold text-sm truncate">{label}</span>
        </Link>
        {onRemove && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onRemove} aria-label={`Remove ${label}`}><X className="h-4 w-4" /></Button>}
      </li>
    );
  };

  if (!isOwn && affiliates.length === 0 && affiliatedWith.length === 0) return null;

  return (
    <Card className="p-5 space-y-4">
      <div>
        <h3 className="font-bold mb-3 flex items-center gap-2"><Handshake className="h-4 w-4" /> Affiliates</h3>
        {affiliates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No affiliates yet.</p>
        ) : (
          <ul className="space-y-1">{affiliates.map((p) => <Item key={p.id} p={p} onRemove={isOwn ? () => remove(profileId, p.id) : undefined} />)}</ul>
        )}
        {isOwn && (
          <div className="mt-3 flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Username to add" onKeyDown={(e) => e.key === "Enter" && add()} />
            <Button onClick={add} disabled={busy}>Add</Button>
          </div>
        )}
      </div>
      {affiliatedWith.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Affiliated with</h4>
          <ul className="space-y-1">{affiliatedWith.map((p) => <Item key={p.id} p={p} onRemove={viewerId === profileId ? () => remove(p.id, profileId) : undefined} />)}</ul>
        </div>
      )}
    </Card>
  );
}
