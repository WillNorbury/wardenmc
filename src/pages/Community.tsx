import { useEffect, useState } from "react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import Particles from "@/components/site/Particles";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { MessageCircle, Megaphone, Users, ArrowRight } from "lucide-react";

type News = { id: string; title: string; excerpt: string | null; slug: string; created_at: string };
type Profile = { id: string; display_name: string | null; avatar_url: string | null; mc_username: string | null };


const Community = () => {
  const [news, setNews] = useState<News[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);

  useEffect(() => {
    document.title = "Community — Warden Network";
    supabase.from("news").select("id,title,excerpt,slug,created_at").eq("published", true).order("created_at", { ascending: false }).limit(4).then(({ data }) => setNews(data ?? []));
    supabase.from("profiles").select("id,display_name,avatar_url,mc_username").limit(8).then(({ data }) => setStaff(data ?? []));
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-28 pb-16 overflow-hidden">
          <Particles count={20} />
          <div className="absolute inset-0 bg-grid opacity-[0.08]" />
          <div className="container relative text-center">
            <Badge variant="secondary" className="mb-4 text-primary border-primary/40">The Crew</Badge>
            <h1 className="font-display text-4xl md:text-6xl font-black mb-3">Welcome to the <span className="text-gradient">Community</span></h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">Join thousands of legends building, fighting, and forging history on Warden Network.</p>
          </div>
        </section>

        <div className="container space-y-20 pb-16">
          {/* Discord embed */}
          <section className="grid md:grid-cols-3 gap-5">
            <Card className="md:col-span-2 p-0 overflow-hidden border-primary/30">
              <iframe
                src="https://discord.com/widget?id=1234567890&theme=dark"
                width="100%"
                height="400"
                allowTransparency
                frameBorder="0"
                sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                title="Discord widget"
                className="w-full"
              />
            </Card>
            <Card className="p-7 flex flex-col justify-center border-primary/30">
              <div className="h-12 w-12 rounded-lg bg-primary/15 text-primary flex items-center justify-center mb-4">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2">Join our Discord</h2>
              <p className="text-sm text-muted-foreground mb-5">Get real-time updates, voice with friends, and chat directly with staff.</p>
              <Button asChild className="glow w-full">
                <a href="https://discord.warden.rip" target="_blank" rel="noreferrer">
                  Join Discord <ArrowRight className="h-4 w-4 ml-1" />
                </a>
              </Button>
            </Card>
          </section>

          {/* Announcements */}
          <section>
            <div className="flex items-end justify-between mb-6">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-primary mb-1">News</div>
                <h2 className="font-display text-3xl font-bold">Latest Announcements</h2>
              </div>
              <Link to="/news" className="text-sm text-primary hover:underline">View all →</Link>
            </div>
            {news.length === 0 ? (
              <Card className="p-10 text-center text-muted-foreground">
                <Megaphone className="h-8 w-8 mx-auto mb-3 text-primary/60" />
                No announcements yet.
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-5">
                {news.map((n) => (
                  <Card key={n.id} className="p-6 hover-lift hover-glow group">
                    <Link to={`/news/${n.slug}`}>
                      <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">{new Date(n.created_at).toLocaleDateString()}</div>
                      <h3 className="font-display font-bold text-lg mb-2 group-hover:text-primary transition">{n.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{n.excerpt}</p>
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Staff cards */}
          <section>
            <div className="flex items-end justify-between mb-6">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-primary mb-1">The Team</div>
                <h2 className="font-display text-3xl font-bold">Meet the Staff</h2>
              </div>
              <Link to="/staff" className="text-sm text-primary hover:underline">Full team →</Link>
            </div>
            {staff.length === 0 ? (
              <Card className="p-10 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-3 text-primary/60" />
                Staff list is being assembled.
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                {staff.map((p) => (
                  <Card key={p.id} className="p-5 text-center hover-lift hover-glow">
                    <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-primary to-accent p-0.5 mb-3">
                      <div className="h-full w-full rounded-full bg-card flex items-center justify-center font-display font-bold text-lg">
                        {p.avatar_url
                          ? <img src={p.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                          : (p.display_name ?? p.mc_username ?? "?")[0]?.toUpperCase()}
                      </div>
                    </div>
                    <div className="font-display font-bold">{p.display_name ?? p.mc_username ?? "Player"}</div>
                    <div className="text-xs text-muted-foreground">Community</div>
                  </Card>
                ))}
              </div>
            )}
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Community;
