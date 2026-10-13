import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { confirm } from "@/lib/confirm";

type Partner = {
  id: string;
  label: string;
  url: string;
  description: string | null;
  icon: string | null;
  website_url: string | null;
  discord_url: string | null;
  sort_order: number;
  is_active: boolean;
};

export const PartnersAdminSection = () => {
  const [rows, setRows] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    else setRows((data ?? []) as Partner[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const update = (id: string, patch: Partial<Partner>) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const save = async (row: Partner) => {
    setSaving(row.id);
    const { error } = await supabase
      .from("partners")
      .update({
        label: row.label,
        url: row.url,
        description: row.description,
        icon: row.icon,
        website_url: row.website_url,
        discord_url: row.discord_url,
        sort_order: row.sort_order,
        is_active: row.is_active,
      })
      .eq("id", row.id);
    setSaving(null);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  };

  const remove = async (row: Partner) => {
    const ok = await confirm({
      title: "Delete partner?",
      description: `Remove "${row.label}" from the Partners menu?`,
      confirmText: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("partners").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      setRows((r) => r.filter((x) => x.id !== row.id));
    }
  };

  const add = async () => {
    const maxOrder = rows.reduce((m, r) => Math.max(m, r.sort_order), 0);
    const { data, error } = await supabase
      .from("partners")
      .insert({
        label: "New Partner",
        url: "https://",
        description: "",
        sort_order: maxOrder + 10,
        is_active: true,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setRows((r) => [...r, data as Partner]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={add} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add partner
        </Button>
      </div>
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No partners yet.</p>
      )}
      <div className="grid gap-4">
        {rows.map((row) => (
          <Card key={row.id} className="p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Label</Label>
                <Input value={row.label} onChange={(e) => update(row.id, { label: e.target.value })} />
              </div>
              <div>
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={row.sort_order}
                  onChange={(e) => update(row.id, { sort_order: parseInt(e.target.value || "0", 10) })}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Minecraft IP</Label>
                <Input
                  value={row.url}
                  placeholder="play.example.net"
                  onChange={(e) => update(row.id, { url: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Description (optional)</Label>
                <Textarea
                  rows={2}
                  value={row.description ?? ""}
                  onChange={(e) => update(row.id, { description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <Switch
                  checked={row.is_active}
                  onCheckedChange={(v) => update(row.id, { is_active: v })}
                />
                <span className="text-sm text-muted-foreground">
                  {row.is_active ? "Visible" : "Hidden"}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => remove(row)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
                <Button size="sm" onClick={() => save(row)} disabled={saving === row.id}>
                  {saving === row.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Save
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PartnersAdminSection;
