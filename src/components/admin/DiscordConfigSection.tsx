import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Save, RefreshCw, Hash, MessageSquare, Terminal } from "lucide-react";

const COMMANDS_KEY = "discord_commands";
const CHANNELS_KEY = "discord_channels";
const TEMPLATES_KEY = "discord_templates";

type CommandKind = "builtin" | "text";
type BotCommand = {
  name: string;
  description: string;
  enabled: boolean;
  kind: CommandKind;
  response: string;
  ephemeral: boolean;
};

type ChannelEntry = { key: string; label: string; channelId: string };
type Template = { key: string; label: string; content: string };

const DEFAULT_COMMANDS: BotCommand[] = [
  { name: "rules", description: "Show the Warden Network server rules", enabled: true, kind: "builtin", response: "", ephemeral: false },
  { name: "subscribe", description: "Subscribe to email notifications from Warden Network", enabled: true, kind: "builtin", response: "", ephemeral: true },
  { name: "unsubscribe", description: "Unsubscribe from email notifications from Warden Network", enabled: true, kind: "builtin", response: "", ephemeral: true },
];

const DEFAULT_CHANNELS: ChannelEntry[] = [
  { key: "announce", label: "Announcements", channelId: "" },
  { key: "status", label: "Server status", channelId: "" },
  { key: "welcome", label: "Welcome", channelId: "" },
  { key: "roles", label: "Server roles", channelId: "" },
  { key: "info", label: "Server info", channelId: "" },
  { key: "rules", label: "Server rules", channelId: "" },
];

const DEFAULT_TEMPLATES: Template[] = [
  { key: "announce", label: "Announcement", content: "📢 {message}" },
  { key: "welcome", label: "Welcome message", content: "Welcome to Warden Network, {user}!" },
  { key: "status", label: "Status footer", content: "Warden Network · Live status" },
];

const slugCmd = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);

export const DiscordConfigSection = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const [commands, setCommands] = useState<BotCommand[]>(DEFAULT_COMMANDS);
  const [channels, setChannels] = useState<ChannelEntry[]>(DEFAULT_CHANNELS);
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [botToken, setBotToken] = useState("");
  const [botTokenSet, setBotTokenSet] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_content")
        .select("key, value")
        .in("key", [COMMANDS_KEY, CHANNELS_KEY, TEMPLATES_KEY]);
      const byKey: Record<string, any> = {};
      (data ?? []).forEach((r: any) => (byKey[r.key] = r.value));

      const savedCmds = byKey[COMMANDS_KEY]?.commands;
      if (Array.isArray(savedCmds) && savedCmds.length) {
        // Keep builtins present even if missing from the saved list
        const merged = [...savedCmds] as BotCommand[];
        DEFAULT_COMMANDS.forEach((d) => {
          if (!merged.some((c) => c.name === d.name)) merged.push(d);
        });
        setCommands(merged);
      }

      const savedChans = byKey[CHANNELS_KEY]?.entries;
      if (Array.isArray(savedChans) && savedChans.length) {
        const merged = [...savedChans] as ChannelEntry[];
        DEFAULT_CHANNELS.forEach((d) => {
          if (!merged.some((c) => c.key === d.key)) merged.push(d);
        });
        setChannels(merged);
      } else {
        // Seed from the legacy discord_bot config so nothing is lost
        const { data: bot } = await supabase
          .from("site_content")
          .select("value")
          .eq("key", "discord_bot")
          .maybeSingle();
        const cfg: any = bot?.value ?? {};
        setChannels(
          DEFAULT_CHANNELS.map((c) => ({ ...c, channelId: cfg[`${c.key}ChannelId`] ?? "" })),
        );
        setBotTokenSet(typeof cfg.botToken === "string" && cfg.botToken.trim().length > 0);
      } else {
        const { data: bot } = await supabase
          .from("site_content")
          .select("value")
          .eq("key", "discord_bot")
          .maybeSingle();
        const cfg: any = bot?.value ?? {};
        setBotTokenSet(typeof cfg.botToken === "string" && cfg.botToken.trim().length > 0);
      }

      const savedTpls = byKey[TEMPLATES_KEY]?.entries;
      if (Array.isArray(savedTpls) && savedTpls.length) {
        const merged = [...savedTpls] as Template[];
        DEFAULT_TEMPLATES.forEach((d) => {
          if (!merged.some((t) => t.key === d.key)) merged.push(d);
        });
        setTemplates(merged);
      }

      setLoading(false);
    })();
  }, []);

  const persist = async (key: string, value: any, label: string) => {
    setSaving(key);
    const { error } = await supabase.from("site_content").upsert({ key, value });
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success(`${label} saved`);
  };

  const saveBotToken = async () => {
    const token = botToken.trim();
    if (!token) return toast.error("Paste the new bot token first");
    setSaving("bot_token");
    const { data } = await supabase.from("site_content").select("value").eq("key", "discord_bot").maybeSingle();
    const cfg: any = data?.value ?? {};
    const { error } = await supabase.from("site_content").upsert({ key: "discord_bot", value: { ...cfg, botToken: token } });
    setSaving(null);
    if (error) return toast.error(error.message);
    setBotToken("");
    setBotTokenSet(true);
    toast.success("Bot token updated — the bot will use it from now on");
  };

  const saveCommands = () => {
    const clean = commands
      .map((c) => ({ ...c, name: slugCmd(c.name), description: c.description.trim().slice(0, 100) }))
      .filter((c) => c.name && c.description);
    if (clean.length !== commands.length) {
      toast.error("Every command needs a name and a description");
      return;
    }
    const names = new Set(clean.map((c) => c.name));
    if (names.size !== clean.length) {
      toast.error("Command names must be unique");
      return;
    }
    setCommands(clean);
    persist(COMMANDS_KEY, { commands: clean }, "Commands");
  };

  const saveChannels = () => {
    const clean = channels
      .map((c) => ({ ...c, key: slugCmd(c.key), label: c.label.trim(), channelId: c.channelId.trim() }))
      .filter((c) => c.key && c.label);
    setChannels(clean);
    // Mirror the core channels back into discord_bot so existing bot actions keep working
    const byKey: Record<string, string> = {};
    clean.forEach((c) => (byKey[c.key] = c.channelId));
    (async () => {
      const { data } = await supabase.from("site_content").select("value").eq("key", "discord_bot").maybeSingle();
      const cfg: any = data?.value ?? {};
      const next = { ...cfg };
      DEFAULT_CHANNELS.forEach((d) => {
        if (byKey[d.key] !== undefined) next[`${d.key}ChannelId`] = byKey[d.key];
      });
      await supabase.from("site_content").upsert({ key: "discord_bot", value: next });
    })();
    persist(CHANNELS_KEY, { entries: clean }, "Channels");
  };

  const saveTemplates = () => {
    const clean = templates
      .map((t) => ({ ...t, key: slugCmd(t.key), label: t.label.trim() }))
      .filter((t) => t.key && t.label);
    setTemplates(clean);
    persist(TEMPLATES_KEY, { entries: clean }, "Templates");
  };

  const syncCommands = async () => {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("discord-register-commands", { body: {} });
    setSyncing(false);
    if (error) return toast.error(error.message);
    if (data?.ok) toast.success(`Synced ${data.registered?.length ?? 0} command(s) to Discord`);
    else toast.error(data?.error ?? "Sync failed");
  };

  if (loading) return <Card className="p-6 text-sm text-muted-foreground">Loading Discord configuration…</Card>;

  return (
    <Tabs defaultValue="commands" className="space-y-6">
      <TabsList>
        <TabsTrigger value="commands" className="gap-2">
          <Terminal className="h-4 w-4" /> Commands
        </TabsTrigger>
        <TabsTrigger value="channels" className="gap-2">
          <Hash className="h-4 w-4" /> Channels
        </TabsTrigger>
        <TabsTrigger value="templates" className="gap-2">
          <MessageSquare className="h-4 w-4" /> Templates
        </TabsTrigger>
      </TabsList>

      {/* ---------------- Commands ---------------- */}
      <TabsContent value="commands" className="space-y-4">
        <Card className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Slash commands</h2>
              <p className="text-sm text-muted-foreground">
                Toggle built-in commands or add your own reply commands, then sync them to Discord.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={syncCommands} disabled={syncing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                Sync to Discord
              </Button>
              <Button onClick={saveCommands} disabled={saving === COMMANDS_KEY}>
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {commands.map((c, i) => (
              <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={c.kind === "builtin" ? "default" : "secondary"}>
                    {c.kind === "builtin" ? "Built-in" : "Custom"}
                  </Badge>
                  <div className="flex items-center gap-2 ml-auto">
                    <Switch
                      checked={c.enabled}
                      onCheckedChange={(v) =>
                        setCommands((prev) => prev.map((x, idx) => (idx === i ? { ...x, enabled: v } : x)))
                      }
                    />
                    <Label className="text-xs">Enabled</Label>
                    {c.kind === "text" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setCommands((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={c.name}
                      disabled={c.kind === "builtin"}
                      onChange={(e) =>
                        setCommands((prev) => prev.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))
                      }
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={c.description}
                      onChange={(e) =>
                        setCommands((prev) =>
                          prev.map((x, idx) => (idx === i ? { ...x, description: e.target.value } : x)),
                        )
                      }
                    />
                  </div>
                </div>
                {c.kind === "text" && (
                  <div>
                    <Label>Reply</Label>
                    <Textarea
                      rows={3}
                      value={c.response}
                      onChange={(e) =>
                        setCommands((prev) =>
                          prev.map((x, idx) => (idx === i ? { ...x, response: e.target.value } : x)),
                        )
                      }
                      placeholder="What the bot replies with. Use {user} for the caller."
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={c.ephemeral}
                    onCheckedChange={(v) =>
                      setCommands((prev) => prev.map((x, idx) => (idx === i ? { ...x, ephemeral: v } : x)))
                    }
                  />
                  <Label className="text-xs">Reply only visible to the person who ran it</Label>
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={() =>
              setCommands((prev) => [
                ...prev,
                { name: "", description: "", enabled: true, kind: "text", response: "", ephemeral: false },
              ])
            }
          >
            <Plus className="h-4 w-4 mr-2" /> Add command
          </Button>
        </Card>
      </TabsContent>

      {/* ---------------- Channels ---------------- */}
      <TabsContent value="channels" className="space-y-4">
        <Card className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Channel routing</h2>
              <p className="text-sm text-muted-foreground">
                Paste Discord channel IDs (right-click a channel → Copy Channel ID with Developer Mode on).
              </p>
            </div>
            <Button onClick={saveChannels} disabled={saving === CHANNELS_KEY}>
              <Save className="h-4 w-4 mr-2" /> Save
            </Button>
          </div>

          <div className="space-y-3">
            {channels.map((c, i) => {
              const core = DEFAULT_CHANNELS.some((d) => d.key === c.key);
              return (
                <div key={i} className="grid md:grid-cols-[1fr_1fr_auto] gap-3 items-end rounded-lg border border-border p-4">
                  <div>
                    <Label>Label</Label>
                    <Input
                      value={c.label}
                      onChange={(e) =>
                        setChannels((prev) => prev.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1 font-mono">{c.key}</p>
                  </div>
                  <div>
                    <Label>Channel ID</Label>
                    <Input
                      value={c.channelId}
                      inputMode="numeric"
                      placeholder="1234567890123456789"
                      onChange={(e) =>
                        setChannels((prev) =>
                          prev.map((x, idx) => (idx === i ? { ...x, channelId: e.target.value } : x)),
                        )
                      }
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={core}
                    onClick={() => setChannels((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>

          <Button
            variant="outline"
            onClick={() => setChannels((prev) => [...prev, { key: "", label: "", channelId: "" }])}
          >
            <Plus className="h-4 w-4 mr-2" /> Add channel
          </Button>
        </Card>
      </TabsContent>

      {/* ---------------- Templates ---------------- */}
      <TabsContent value="templates" className="space-y-4">
        <Card className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Message templates</h2>
              <p className="text-sm text-muted-foreground">
                Placeholders: <code>{"{user}"}</code>, <code>{"{message}"}</code>, <code>{"{ip}"}</code>.
              </p>
            </div>
            <Button onClick={saveTemplates} disabled={saving === TEMPLATES_KEY}>
              <Save className="h-4 w-4 mr-2" /> Save
            </Button>
          </div>

          <div className="space-y-3">
            {templates.map((t, i) => {
              const core = DEFAULT_TEMPLATES.some((d) => d.key === t.key);
              return (
                <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                  <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                    <div>
                      <Label>Label</Label>
                      <Input
                        value={t.label}
                        onChange={(e) =>
                          setTemplates((prev) => prev.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div>
                      <Label>Key</Label>
                      <Input
                        value={t.key}
                        disabled={core}
                        onChange={(e) =>
                          setTemplates((prev) => prev.map((x, idx) => (idx === i ? { ...x, key: e.target.value } : x)))
                        }
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={core}
                      onClick={() => setTemplates((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div>
                    <Label>Content</Label>
                    <Textarea
                      rows={3}
                      value={t.content}
                      onChange={(e) =>
                        setTemplates((prev) => prev.map((x, idx) => (idx === i ? { ...x, content: e.target.value } : x)))
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            variant="outline"
            onClick={() => setTemplates((prev) => [...prev, { key: "", label: "", content: "" }])}
          >
            <Plus className="h-4 w-4 mr-2" /> Add template
          </Button>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default DiscordConfigSection;
