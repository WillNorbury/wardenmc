import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_SKYWARSSMP_CONTENT,
  fetchSkywarsSMPContent,
  saveSkywarsSMPContent,
  type SkywarsSMPContent,
} from "@/lib/skywarssmp";

export const SkywarsSMPAdminSection = () => {
  const [content, setContent] = useState<SkywarsSMPContent>(DEFAULT_SKYWARSSMP_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSkywarsSMPContent()
      .then(setContent)
      .catch((error) => toast.error(error instanceof Error ? error.message : "Couldn't load SkywarsSMP content"))
      .finally(() => setLoading(false));
  }, []);

  const update = (patch: Partial<SkywarsSMPContent>) => setContent((current) => ({ ...current, ...patch }));

  const save = async () => {
    setSaving(true);
    const result = await saveSkywarsSMPContent({
      ...content,
      join_steps: content.join_steps.map((step) => step.trim()).filter(Boolean),
    });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("SkywarsSMP page saved");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading SkywarsSMP content…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Edit the public joining guide at <code className="rounded bg-muted px-1">/skywarssmp</code>.
        </p>
        <Button asChild variant="outline" size="sm">
          <a href="/skywarssmp" target="_blank" rel="noreferrer">
            View page <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        </Button>
      </div>

      <Card className="p-5 md:p-6 space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="skywarssmp-ip">Server address</Label>
            <Input
              id="skywarssmp-ip"
              value={content.server_ip}
              onChange={(event) => update({ server_ip: event.target.value })}
              placeholder="play.warden.rip"
              maxLength={253}
            />
            <p className="text-xs text-muted-foreground">The address players use to join Warden Network.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="skywarssmp-command">SkywarsSMP queue command</Label>
            <Input
              id="skywarssmp-command"
              value={content.join_command}
              onChange={(event) => update({ join_command: event.target.value })}
              placeholder="/joinqueue SkywarsSMP"
              maxLength={120}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">Players enter this command after joining the network.</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="skywarssmp-tagline">Tagline</Label>
          <Input
            id="skywarssmp-tagline"
            value={content.tagline}
            onChange={(event) => update({ tagline: event.target.value })}
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="skywarssmp-description">Introduction</Label>
          <Textarea
            id="skywarssmp-description"
            value={content.description}
            onChange={(event) => update({ description: event.target.value })}
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="skywarssmp-steps">Joining steps</Label>
          <Textarea
            id="skywarssmp-steps"
            value={content.join_steps.join("\n")}
            onChange={(event) => update({ join_steps: event.target.value.split("\n") })}
            rows={8}
          />
          <p className="text-xs text-muted-foreground">Write one step per line. Blank lines are removed when you save.</p>
        </div>

        <div className="flex justify-end border-t border-border pt-5">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save SkywarsSMP page
          </Button>
        </div>
      </Card>
    </div>
  );
};
