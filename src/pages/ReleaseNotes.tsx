import { useEffect, useState } from "react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Tag, Calendar } from "lucide-react";

type Note = {
  version: string | null;
  date: string;
  entries: { title: string; content: string; category: string }[];
  breaking: { title: string; content: string }[];
};

// Older release-note snapshots retain the former public name until the next successful generation.
const currentBrand = (text: string) => text.replace(/CarnageMC/g, "WardenMC");

const ReleaseNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Release Notes — Warden Network";
    fetch("/release-notes.json", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setNotes(d.notes ?? []);
        setGeneratedAt(d.generatedAt ?? null);
      })
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="pt-28 pb-10">
          <div className="container text-center">
            <Badge variant="secondary" className="mb-4 text-primary border-primary/40">
              <Tag className="h-3 w-3 mr-1" /> Versioned Releases
            </Badge>
            <h1 className="font-display text-4xl md:text-6xl font-black mb-3">
              Release <span className="text-gradient">Notes</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Auto-generated from the changelog at build time. Breaking changes are surfaced first.
            </p>
            {generatedAt && (
              <p className="mt-2 text-xs text-muted-foreground">
                Generated {new Date(generatedAt).toLocaleString()}
              </p>
            )}
          </div>
        </section>

        <div className="container pb-20 max-w-4xl space-y-6">
          {loading && <p className="text-muted-foreground text-center">Loading…</p>}
          {error && (
            <Card className="p-4 border-destructive/40">
              <p className="text-sm text-destructive">
                Release notes unavailable: {error}. They are generated during the production build.
              </p>
            </Card>
          )}
          {!loading && !error && notes.length === 0 && (
            <p className="text-muted-foreground text-center">No releases yet.</p>
          )}
          {notes.map((n) => (
            <Card key={`${n.version ?? "u"}-${n.date}`} className="p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-2xl font-bold font-display">
                  {n.version ?? "Unreleased"}
                </h2>
                <span className="inline-flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  {n.date}
                </span>
              </div>

              {n.breaking.length > 0 && (
                <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-4">
                  <div className="flex items-center gap-2 mb-2 text-destructive font-semibold">
                    <AlertTriangle className="h-4 w-4" /> Breaking changes
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {n.breaking.map((b, i) => (
                      <li key={i}>
                        <span className="font-medium">{currentBrand(b.title)}</span>
                        <span className="text-muted-foreground"> — {currentBrand(b.content)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <ul className="space-y-2 text-sm">
                {n.entries.map((e, i) => (
                  <li key={i} className="flex gap-2">
                    <Badge variant="outline" className="shrink-0 capitalize">
                      {e.category}
                    </Badge>
                    <div>
                          <span className="font-medium">{currentBrand(e.title)}</span>
                          <span className="text-muted-foreground"> — {currentBrand(e.content)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ReleaseNotes;
