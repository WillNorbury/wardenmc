import { useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Bot, Headset, Radio, Sparkles, Users, Handshake } from "lucide-react";
import DiscordMark from "@/components/site/DiscordMark";
import logo from "@/assets/warden-network-logo.png";

const destinations = [
  { title: "Discord", detail: "Community chat", to: "/discord", icon: DiscordMark },
  { title: "Yapin'", detail: "Our Yapin' community", to: "/yapin", icon: Sparkles },
  { title: "WardenBot", detail: "Bot invite & server dashboard", to: "/bot", icon: Bot },
  { title: "Live streams", detail: "WillNorbury & SpectorDev", to: "/live", icon: Radio },
  { title: "Members", detail: "The people in our community", to: "/users", icon: Users },
  { title: "Partners", detail: "Servers & communities", to: "/partners", icon: Handshake },
];
export default function Community() {
  useEffect(() => { document.title = "Community — Warden Network"; }, []);
  return <div className="flex min-h-screen flex-col"><Navbar /><main className="flex-1">
    <header className="container max-w-5xl pt-32 pb-10">
      <img src={logo} alt="Warden Network" className="mb-8 h-20 max-w-full object-contain object-left" />
      <p className="mb-3 text-sm font-semibold text-primary">WARDEN NETWORK</p>
      <h1 className="font-display text-5xl sm:text-7xl">Community</h1>
      <p className="mt-4 text-lg text-muted-foreground">Find your people. Stay connected.</p>
    </header>
    <section className="container max-w-5xl pb-16"><div className="grid gap-4 sm:grid-cols-2">
      {destinations.map(d => <article key={d.to} className="rounded-lg border border-border bg-card p-6">
        <d.icon className="mb-6 h-8 w-8 text-primary" /><h2 className="font-display text-3xl">{d.title}</h2><p className="mt-2 text-muted-foreground">{d.detail}</p>
        <Button asChild variant="outline" className="mt-6"><Link to={d.to}>Open {d.title}<ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>
      </article>)}
    </div></section>
    <section className="border-t border-border bg-muted/30"><div className="container flex max-w-5xl flex-col gap-5 py-10 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-3xl">Need a hand?</h2><p className="mt-2 text-muted-foreground">Player questions, reports and appeals.</p></div><Button asChild><Link to="/support"><Headset className="mr-2 h-4 w-4" />Player Support Centre</Link></Button></div></section>
  </main><Footer /></div>;
}