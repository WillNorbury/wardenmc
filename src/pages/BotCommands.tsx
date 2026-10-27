import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Search, Terminal } from "lucide-react";
import logo from "@/assets/warden-network-icon.png";
import { MODERATION_COMMANDS } from "../../supabase/functions/_shared/discord-command-catalog";

const permissions: Record<string, string> = { "2": "Kick Members", "4": "Ban Members", "16": "Manage Channels", "8192": "Manage Messages", "1099511627776": "Moderate Members", "134217728": "Manage Nicknames", "268435456": "Manage Roles", "4194304": "Mute Members", "8388608": "Deafen Members", "16777216": "Move Members" };
const utility = [
  ["rules", "Show the published community rules", ""], ["help", "List public commands", ""],
  ["apply", "Open this server's application website", ""], ["setapply", "Set this server's application website", "url"],
  ["status", "Set up a live Minecraft status panel", "setup ip"], ["addcommand", "Create a server-specific reply command", "name response"],
  ["removecommand", "Remove a server-specific reply command", "name"], ["commands", "List this server's custom commands", ""],
  ["subscribe", "Subscribe to website email notifications with a linked account", ""], ["unsubscribe", "Stop website email notifications", ""],
].map(([name, description, args]) => ({ name, description, usage: `/${name}${args ? ` ${args}` : ""}`, category: "utility", permission: ["setapply", "status", "addcommand", "removecommand"].includes(name) ? "Manage Server" : "Everyone" }));
const commands = [...MODERATION_COMMANDS.filter(c => c.name !== "help").map(c => ({
  name: c.name, description: c.description,
  usage: `/${c.name}${c.options.map(o => ` ${o.required ? `<${o.name}>` : `[${o.name}]`}`).join("")}`,
  category: c.category === "fun" ? "fun" : c.category === "voice" ? "voice" : "moderation",
  permission: c.perm === 0n ? "Everyone" : permissions[c.perm.toString()] ?? "Staff",
})), ...utility];

export default function BotCommands() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  useEffect(() => { document.title = "WardenBot Commands — Warden Network"; }, []);
  const visible = commands.filter(c => (category === "all" || c.category === category) && `${c.name} ${c.description} ${c.permission}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="flex min-h-screen flex-col"><Navbar /><main className="flex-1">
    <header className="container max-w-6xl pt-32 pb-10">
      <Button asChild variant="ghost" size="sm"><Link to="/bot"><ArrowLeft className="mr-2 h-4 w-4" />WardenBot</Link></Button>
      <div className="mt-6 flex items-center gap-5"><img src={logo} alt="Warden Network" className="h-16 w-16 shrink-0 object-contain" /><div><p className="text-sm text-primary">WARDENBOT</p><h1 className="font-display text-4xl sm:text-6xl">Command directory</h1></div></div>
    </header>
    <section className="container max-w-6xl pb-20">
      <div className="flex flex-col gap-4 border-y border-border py-5 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={category} onValueChange={setCategory}><TabsList className="flex h-auto flex-wrap justify-start">{["all", "utility", "moderation", "voice", "fun"].map(c => <TabsTrigger key={c} value={c} className="capitalize">{c}</TabsTrigger>)}</TabsList></Tabs>
        <div className="relative w-full lg:w-72"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search commands" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search commands…" className="pl-9" /></div>
      </div>
      <p className="my-5 text-sm text-muted-foreground">{visible.length} commands</p>
      <div className="grid gap-4 md:grid-cols-2">{visible.map(c => <article key={c.name} className="min-w-0 rounded-lg border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3"><h2 className="flex items-center gap-2 font-mono text-lg text-primary"><Terminal className="h-4 w-4 shrink-0" />/{c.name}</h2><span className="text-right text-xs text-muted-foreground">{c.permission}</span></div>
        <p className="mt-3 text-sm text-muted-foreground">{c.description}</p><code className="mt-4 block break-words border-t border-border pt-3 text-xs">{c.usage}</code>
      </article>)}</div>
      {visible.length === 0 && <p className="py-16 text-center text-muted-foreground">No matching commands.</p>}
    </section>
  </main><Footer /></div>;
}