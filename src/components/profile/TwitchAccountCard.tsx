import { useEffect, useState } from "react";
import { Link2, Unlink, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { twitchAccountRequest, waitForTwitch, type TwitchAccount } from "@/lib/twitch-account";
import { toast } from "sonner";
export default function TwitchAccountCard() {
  const [account, setAccount] = useState<TwitchAccount>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true); setError("");
    try { setAccount(await twitchAccountRequest<TwitchAccount>({ action: "profile" })); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not load Twitch account."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const connect = async () => {
    const popup = window.open("", "warden-twitch", "width=600,height=720");
    if (!popup) { toast.error("Allow popups to link Twitch, then try again."); return; }
    setBusy(true);
    try {
      const { authorizationUrl } = await twitchAccountRequest<{ authorizationUrl: string }>({ action: "start", origin: window.location.origin });
      const completion = waitForTwitch(popup);
      popup.location.href = authorizationUrl;
      await completion;
      const next = await twitchAccountRequest<TwitchAccount>({ action: "profile" });
      setAccount(next); setError("");
      if (!next.connected) throw new Error("Twitch access needs to be renewed. Try linking again.");
      toast.success(account.connected || account.reconnectRequired ? "Reconnected to Twitch" : "Twitch account linked");
    } catch (error) { popup.close(); toast.error(error instanceof Error ? error.message : "Twitch linking failed."); }
    finally { setBusy(false); }
  };
  const disconnect = async () => {
    setBusy(true);
    try { await twitchAccountRequest({ action: "disconnect" }); setAccount({ connected: false }); toast.success("Twitch account unlinked"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not unlink Twitch."); }
    finally { setBusy(false); }
  };
  return <Card className="p-6 mt-6 space-y-4">
    <div className="flex items-center gap-2"><Link2 className="h-5 w-5 text-primary" /><h2 className="font-display font-bold text-lg">Twitch account</h2></div>
    {loading ? <Loader2 aria-label="Loading Twitch account" className="h-5 w-5 animate-spin text-muted-foreground" /> : error ? <div role="alert" className="space-y-3"><p className="text-sm text-destructive break-words">{error}</p><Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Retry</Button></div> : <div className="flex flex-wrap items-center justify-between gap-4">
      {account.connected && account.profile ? <div className="flex items-center gap-3 min-w-0"><Avatar><AvatarImage src={account.profile.avatarUrl} /><AvatarFallback>{account.profile.displayName.slice(0, 2)}</AvatarFallback></Avatar><a href={`https://twitch.tv/${encodeURIComponent(account.profile.login)}`} target="_blank" rel="noopener noreferrer" className="font-medium text-primary break-all">{account.profile.displayName}</a></div> : <p className="text-sm text-muted-foreground">{account.reconnectRequired ? "Your Twitch access needs to be renewed." : "Not linked"}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={connect} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}{account.connected || account.reconnectRequired ? "Reconnect Twitch" : "Link Twitch"}</Button>
        {account.connected && <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" disabled={busy}><Unlink className="h-4 w-4 mr-2" />Unlink Twitch</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Unlink Twitch account?</AlertDialogTitle><AlertDialogDescription>Your Twitch connection will be removed. Your Warden account stays unchanged.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={disconnect}>Unlink</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
      </div>
    </div>}
  </Card>;
}
