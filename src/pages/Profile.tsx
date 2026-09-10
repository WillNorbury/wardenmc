import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { roleLabel, type AppRole } from "@/lib/roles";
import { userProfilePath } from "@/lib/userSlug";
import { applyTheme, DEFAULT_PREFS, type UserPreferences } from "@/lib/preferences";
import { toast } from "sonner";
import { Bell, ExternalLink, Loader2, Lock, MessageCircle, Palette, Unlink } from "lucide-react";
import OrganizationsCard from "@/components/site/OrganizationsCard";
import TwoFactorCard from "@/components/profile/TwoFactorCard";
import MyPluginsPanel from "@/components/dashboard/MyPluginsPanel";

const Profile = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [mcUsername, setMcUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [prefs, setPrefs] = useState<Required<UserPreferences>>(DEFAULT_PREFS);
  const [savedMc, setSavedMc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [discord, setDiscord] = useState<{ id: string | null; username: string | null; avatar: string | null }>({ id: null, username: null, avatar: null });
  const [linkingDiscord, setLinkingDiscord] = useState(false);
  const [unlinkingDiscord, setUnlinkingDiscord] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const changePassword = async () => {
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPw(false);
    if (error) return toast.error(error.message);
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated");
  };

  const MC_RE = /^[A-Za-z0-9_]{3,16}$/;
  const mcInvalid = !MC_RE.test(mcUsername.trim());

  useEffect(() => {
    document.title = "My Profile — Warden Network";
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("discord");
    const msg = params.get("msg");
    if (status === "linked") {
      toast.success(`Discord linked${msg ? ` as ${msg}` : ""}`);
    } else if (status === "error") {
      const map: Record<string, string> = {
        already_linked: "That Discord account is already linked to another user.",
        expired_state: "Link request expired. Please try again.",
        invalid_state: "Invalid link request. Please try again.",
        token_exchange_failed: "Discord rejected the authorization. Try again.",
        fetch_user_failed: "Couldn't read your Discord profile.",
      };
      toast.error(map[msg ?? ""] ?? "Discord link failed");
    }
    if (status) {
      const url = new URL(window.location.href);
      url.searchParams.delete("discord");
      url.searchParams.delete("msg");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);


  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    (async () => {
      const [{ data: p }, { data: r }, { data: priv }] = await Promise.all([
        supabase.from("profiles").select("display_name, mc_username, avatar_url").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.rpc("get_my_private_profile"),
      ]);
      const privateRow = Array.isArray(priv) ? priv[0] : null;
      setDisplayName(p?.display_name ?? "");
      setMcUsername(p?.mc_username ?? "");
      setSavedMc(p?.mc_username ?? null);
      setDiscord({
        id: (privateRow as any)?.discord_id ?? null,
        username: (privateRow as any)?.discord_username ?? null,
        avatar: (privateRow as any)?.discord_avatar ?? null,
      });
      setAvatarUrl(p?.avatar_url ?? "");
      setRoles(((r ?? []) as { role: AppRole }[]).map((x) => x.role));
      const loaded = { ...DEFAULT_PREFS, ...(((privateRow as any)?.preferences as UserPreferences) ?? {}) };
      setPrefs(loaded);
      applyTheme(loaded.theme);
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  const updatePref = <K extends keyof Required<UserPreferences>>(key: K, value: Required<UserPreferences>[K]) => {
    setPrefs((p) => {
      const next = { ...p, [key]: value };
      if (key === "theme") applyTheme(value as Required<UserPreferences>["theme"]);
      return next;
    });
  };

  const save = async () => {
    if (!user) return;
    if (mcInvalid) {
      toast.error("Invalid Minecraft username — your previous value will be kept.");
      setMcUsername(savedMc ?? "");
      return;
    }
    const trimmedMc = mcUsername.trim();
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName || null,
        mc_username: trimmedMc,
        avatar_url: avatarUrl || null,
      })
      .eq("id", user.id);
    const { error: prefError } = await (supabase as any).rpc("set_my_preferences", { _prefs: prefs });
    setSaving(false);
    if (error) return toast.error(error.message);
    if (prefError) return toast.error(prefError.message);
    setSavedMc(trimmedMc);
    setMcUsername(trimmedMc);
    toast.success("Profile saved");
  };

  const unlinkMinecraft = async () => {
    if (!user) return;
    setUnlinking(true);
    const { error } = await supabase.from("profiles").update({ mc_username: null }).eq("id", user.id);
    setUnlinking(false);
    if (error) return toast.error(error.message);
    setMcUsername("");
    setSavedMc(null);
    toast.success("Minecraft account unlinked");
  };

  const linkDiscord = async () => {
    setLinkingDiscord(true);
    const { data, error } = await supabase.functions.invoke("discord-link-start", {
      body: { return_to: `${window.location.origin}/profile` },
    });
    setLinkingDiscord(false);
    if (error || !data?.url) {
      return toast.error(error?.message || "Could not start Discord link");
    }
    window.location.href = data.url;
  };

  const unlinkDiscord = async () => {
    if (!user) return;
    setUnlinkingDiscord(true);
    const { error } = await supabase
      .from("profiles_private")
      .update({ discord_id: null, discord_username: null, discord_avatar: null })
      .eq("user_id", user.id);
    setUnlinkingDiscord(false);
    if (error) return toast.error(error.message);
    setDiscord({ id: null, username: null, avatar: null });
    toast.success("Discord account unlinked");
  };

  if (authLoading || loading) {
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

  const shortId = user!.id.slice(0, 8);
  const publicProfilePath = userProfilePath({ id: user!.id, display_name: displayName, mc_username: mcUsername });
  const initials = (displayName || user!.email || "?").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold text-glow">My Profile</h1>
            <p className="text-muted-foreground mt-1">Manage your Warden Network account</p>
          </div>
          <Button asChild variant="outline">
            <Link to={publicProfilePath}>
              View public profile <ExternalLink className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl || (mcUsername ? `https://mc-heads.net/avatar/${mcUsername}/128` : undefined)} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="font-semibold truncate">{user!.email}</div>
              <div className="text-xs text-muted-foreground font-mono">ID: {shortId}</div>
              <div className="flex flex-wrap gap-1 mt-2">
                {roles.length === 0 && <span className="text-xs text-muted-foreground">No roles</span>}
                {roles.map((r) => (
                  <Badge key={r} variant="secondary">{roleLabel(r)}</Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="display_name">Display name</Label>
              <Input id="display_name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <Label htmlFor="mc_username">Minecraft username</Label>
                {mcUsername && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive">
                        <Unlink className="h-3.5 w-3.5 mr-1" /> Unlink
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Unlink Minecraft account?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your linked username <strong>{mcUsername}</strong> will be removed from your profile. You can re-link it any time.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={unlinkMinecraft} disabled={unlinking}>
                          {unlinking && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          Unlink
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <Input
                id="mc_username"
                value={mcUsername}
                onChange={(e) => setMcUsername(e.target.value)}
                placeholder="Notch"
                aria-invalid={mcInvalid}
                className={mcInvalid ? "border-destructive focus-visible:ring-destructive" : undefined}
              />
              {mcInvalid ? (
                <p className="text-xs text-destructive mt-1">
                  Must be 3–16 characters, letters/numbers/underscore only.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">Used to display your in-game skin avatar.</p>
              )}
            </div>
            <div>
              <Label htmlFor="avatar_url">Custom avatar URL (optional)</Label>
              <Input id="avatar_url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>

          <div className="flex justify-between flex-wrap gap-2">
            <Button variant="outline" onClick={async () => { await signOut(); navigate("/"); }}>
              Sign out
            </Button>
            <Button onClick={save} disabled={saving || mcInvalid}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save changes
            </Button>
          </div>
        </Card>

        <Card className="p-6 mt-6 space-y-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[#5865F2]" />
            <h2 className="font-display font-bold text-lg">Discord account</h2>
          </div>
          {discord.id ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={discord.avatar ?? undefined} />
                  <AvatarFallback>{(discord.username ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{discord.username}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate">ID: {discord.id}</div>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Unlink className="h-3.5 w-3.5 mr-1" /> Unlink Discord
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Unlink Discord account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      <strong>{discord.username}</strong> will be disconnected from your Warden Network account. You can re-link it any time.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={unlinkDiscord} disabled={unlinkingDiscord}>
                      {unlinkingDiscord && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Unlink
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-muted-foreground">
                Connect your Discord to display your tag on your public profile and unlock community features.
              </p>
              <Button onClick={linkDiscord} disabled={linkingDiscord} className="bg-[#5865F2] hover:bg-[#4752c4] text-white">
                {linkingDiscord ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageCircle className="h-4 w-4 mr-2" />}
                Link Discord
              </Button>
            </div>
          )}
        </Card>

        <OrganizationsCard userId={user!.id} />

        <div className="mt-6">
          <MyPluginsPanel userId={user!.id} />
        </div>




        <Card className="p-6 mt-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Palette className="h-5 w-5 text-primary" />
              <h2 className="font-display font-bold text-lg">Appearance</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Choose how Warden Network looks on this device.</p>
            <div className="max-w-xs">
              <Label htmlFor="theme">Theme</Label>
              <Select value={prefs.theme} onValueChange={(v) => updatePref("theme", v as typeof prefs.theme)}>
                <SelectTrigger id="theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="font-display font-bold text-lg">Notifications</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Pick which email updates you'd like to receive.</p>
            <div className="space-y-4">
              {[
                { key: "notify_news" as const, title: "News & announcements", desc: "Server news posts and major announcements." },
                { key: "notify_updates" as const, title: "Server updates", desc: "Changelog entries and patch notes." },
                { key: "notify_tickets" as const, title: "Support ticket replies", desc: "Email me when staff replies to my tickets." },
                { key: "notify_applications" as const, title: "Application status", desc: "Updates on staff/builder/youtuber applications." },
              ].map((row) => (
                <div key={row.key} className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{row.title}</div>
                    <div className="text-xs text-muted-foreground">{row.desc}</div>
                  </div>
                  <Switch checked={prefs[row.key]} onCheckedChange={(v) => updatePref(row.key, v)} />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save preferences
            </Button>
          </div>
        </Card>

        <Card className="p-6 mt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <h2 className="font-display font-bold text-lg">Change password</h2>
          </div>
          <p className="text-sm text-muted-foreground">Set a new password for your account. No email confirmation required.</p>
          <div className="grid gap-3 max-w-sm">
            <div>
              <Label htmlFor="new_password">New password</Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
            </div>
            <div>
              <Label htmlFor="confirm_password">Confirm new password</Label>
              <Input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={changePassword} disabled={changingPw || !newPassword || !confirmPassword}>
              {changingPw ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update password
            </Button>
          </div>
        </Card>

        <TwoFactorCard />
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
