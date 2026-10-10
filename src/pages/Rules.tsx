import { useEffect, useState } from "react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import Particles from "@/components/site/Particles";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { getIcon } from "@/lib/features";
import { SEO } from "@/components/site/SEO";

type Section = { id: string; icon: string; title: string; items: string[] };

const Rules = () => {
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    document.title = "Rules — WardenMC";
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("rule_sections")
        .select("id, icon, title, items")
        .eq("published", true)
        .order("sort_order", { ascending: true });
      setSections((data ?? []) as Section[]);
    })();
  }, []);


  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Rules — WardenMC"
        description="WardenMC Network rules for community conduct, chat, advertising, content safety, and staff enforcement."
        path="/rules"
      />
      <Navbar />
      <main className="flex-1">
        <section className="relative pt-28 pb-14 overflow-hidden">
          <Particles count={20} />
          <div className="absolute inset-0 bg-grid opacity-[0.08]" />
          <div className="container relative text-center">
            <Badge variant="secondary" className="mb-4 text-primary border-primary/40"><ShieldCheck className="h-3 w-3 mr-1" /> Code of Conduct</Badge>
            <h1 className="font-display text-4xl md:text-6xl font-black mb-3">🩸 <span className="text-gradient">WardenMC</span> Network Rules</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              <em>By participating in WardenMC, you agree to follow these rules.</em>
            </p>
          </div>
        </section>

        <div className="container pb-16 space-y-6 max-w-4xl">
          {sections.map((s, idx) => {
            const Icon = getIcon(s.icon);
            return (
              <Card key={s.id} className="p-7 hover-glow border-border/60 group">
                <div className="flex items-start gap-5">
                  <div className="h-12 w-12 shrink-0 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-primary flex items-center justify-center group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.5)] transition">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-display text-xs uppercase tracking-widest text-primary">Section {String(idx + 1).padStart(2, "0")}</span>
                    </div>
                    <h2 className="font-display text-2xl font-bold mb-4">#{idx + 1} — {s.title}</h2>
                    <ul className="space-y-2.5">
                      {s.items.map((item, i) => (
                        <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                          <span className="text-primary mt-0.5" aria-hidden="true">•</span>
                          <div className="min-w-0 break-words"><ReactMarkdown components={{ strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong> }}>{item}</ReactMarkdown></div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            );
          })}

          <blockquote className="border-l-2 border-primary pl-5 space-y-2 text-sm text-muted-foreground">
            <p>⚠️ By remaining in WardenMC, you agree to follow these rules.</p>
            <p>🩸 <strong className="text-foreground">WardenMC</strong> — <em>Built for the community.</em></p>
          </blockquote>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Rules;
