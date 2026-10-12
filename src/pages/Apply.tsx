import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { z } from "zod";
import * as Icons from "lucide-react";
import {
  Loader2,
  ClipboardList,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Handshake,
} from "lucide-react";
import { SEO } from "@/components/site/SEO";
import { cn } from "@/lib/utils";

export type ApplicationType = {
  id: string;
  slug: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
  enabled: boolean;
  accepting: boolean;
  requires_portfolio: boolean;
  portfolio_label: string | null;
  intro: string | null;
};

const STEPS = ["About you", "Your story", "Review"] as const;

const mcUsernameSchema = z.string().trim().regex(/^[A-Za-z0-9_]{3,16}$/, "Invalid Minecraft username");
const aboutSchema = z.object({
  mc_username: mcUsernameSchema,
  discord: z.string().trim().max(64).optional().or(z.literal("")),
  age: z.string().trim().refine((v) => v === "" || (/^\d+$/.test(v) && +v >= 10 && +v <= 99), "Age 10–99"),
  timezone: z.string().trim().max(64).optional().or(z.literal("")),
});
const storySchema = z.object({
  experience: z.string().trim().max(2000).optional().or(z.literal("")),
  why: z.string().trim().min(30, "Tell us a bit more (min 30 chars)").max(2000),
  portfolio_url: z.string().trim().url("Must be a valid URL").max(500).optional().or(z.literal("")),
});

const getIcon = (name: string) => {
  const I = (Icons as any)[name];
  return (I as any) ?? ClipboardList;
};

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex flex-col bg-background">
    <Navbar />
    <main className="flex-1 pt-24 pb-16">{children}</main>
    <Footer />
  </div>
);

const Apply = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [types, setTypes] = useState<ApplicationType[] | null>(null);

  useEffect(() => {
    supabase
      .from("application_types" as any)
      .select("*")
      .eq("enabled", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setTypes(((data ?? []) as unknown) as ApplicationType[]));
  }, []);

  if (slug) {
    if (slug === "partner") {
      return <PartnerApplyForm types={types} onBack={() => navigate("/apply")} />;
    }
    return <ApplyForm slug={slug} types={types} onBack={() => navigate("/apply")} />;
  }

  return (
    <Shell>
      <SEO
        title="Apply — Join the Team"
        description="Apply to join the team. Pick a role and tell us about yourself."
        path="/apply"
      />
      <section className="aurora border-b border-border/60 mb-10">
        <div className="container max-w-4xl py-12 md:py-16">
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-accent">WardenMC · Applications</div>
          <h1 className="font-display text-7xl leading-none md:text-8xl">
            JOIN THE <span className="text-gradient">TEAM</span>
          </h1>
          <p className="mt-3 text-base text-muted-foreground md:text-lg">Pick the role that fits you best and tell us your story.</p>
        </div>
      </section>
      <div className="container max-w-4xl">

      {!types && (
        <div className="container max-w-4xl flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {types && types.length === 0 && (
        <Card className="container max-w-4xl p-10 text-center text-muted-foreground">
          No application types are currently available. Check back soon.
        </Card>
      )}

      {types && types.some((t) => t.slug === "partner" && t.accepting) && (
        <Link
          to="/apply/partner"
          className="group relative block mb-6 rounded-xl border border-primary/40 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-6 hover:border-primary hover:shadow-elegant transition"
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 shrink-0 rounded-lg bg-primary/20 grid place-items-center">
              <Handshake className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-primary border-primary/40">
                  Server owners
                </Badge>
                <Badge variant="outline">Partnerships open</Badge>
              </div>
              <div className="font-display font-bold text-xl">
                Run a Minecraft server? <span className="text-gradient">Become a WardenMC Partner.</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Get your server listed on our Partners page with live status, cross-promote your
                community, and reach new players. Apply in a few minutes.
              </p>
              <div className="mt-3 inline-flex items-center text-sm text-primary font-medium">
                Send a partner application
                <ArrowRight className="h-4 w-4 ml-1 transition group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        </Link>
      )}

      {types && types.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {types.map((t) => {
            const Icon = getIcon(t.icon);
            return (
              <Link
                key={t.id}
                to={t.accepting ? `/apply/${t.slug}` : "#"}
                onClick={(e) => {
                  if (!t.accepting) {
                    e.preventDefault();
                    toast.info(`${t.label} applications are currently closed.`);
                  }
                }}
                className={cn(
                  "group relative p-6 rounded-xl border bg-card transition",
                  t.accepting
                    ? "hover:border-primary/60 hover:shadow-elegant"
                    : "opacity-60 cursor-not-allowed"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <Icon className="h-7 w-7 text-primary" />
                  {!t.accepting && <Badge variant="outline">Closed</Badge>}
                </div>
                <div className="font-display font-bold text-lg">{t.label}</div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{t.description}</p>
                {t.accepting && (
                  <div className="mt-4 flex items-center text-sm text-primary font-medium">
                    Apply now <ChevronRight className="h-4 w-4 ml-1 transition group-hover:translate-x-1" />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
      </div>
    </Shell>
  );
};

const ApplyForm = ({
  slug,
  types,
  onBack,
}: {
  slug: string;
  types: ApplicationType[] | null;
  onBack: () => void;
}) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    mc_username: "",
    discord: "",
    age: "",
    timezone: "",
    experience: "",
    why: "",
    portfolio_url: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<ApplicationType | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);

  useEffect(() => {
    if (types) {
      const found = types.find((t) => t.slug === slug) ?? null;
      if (!found) {
        // Try DB fetch directly in case it's enabled but list hasn't loaded
        supabase
          .from("application_types" as any)
          .select("*")
          .eq("slug", slug)
          .eq("enabled", true)
          .maybeSingle()
          .then(({ data }) => {
            if (!data) setTypeError("This application type doesn't exist.");
            else setType((data as unknown) as ApplicationType);
          });
      } else {
        setType(found);
      }
    }
  }, [slug, types]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(`/apply/${slug}`)}`);
      return;
    }
    supabase
      .from("profiles")
      .select("mc_username")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.mc_username) setForm((f) => ({ ...f, mc_username: data.mc_username! }));
      });
  }, [user, authLoading, navigate, slug]);

  const next = () => {
    if (step === 0) {
      const r = aboutSchema.safeParse(form);
      if (!r.success) return toast.error(r.error.issues[0].message);
    }
    if (step === 1) {
      const r = storySchema.safeParse(form);
      if (!r.success) return toast.error(r.error.issues[0].message);
      if (type?.requires_portfolio && !form.portfolio_url) {
        return toast.error("Portfolio link is required.");
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    if (!user || !type) return;
    const a = aboutSchema.safeParse(form);
    if (!a.success) {
      setStep(0);
      return toast.error(a.error.issues[0].message);
    }
    const s = storySchema.safeParse(form);
    if (!s.success) {
      setStep(1);
      return toast.error(s.error.issues[0].message);
    }
    setSubmitting(true);
    const { data: inserted, error } = await supabase.from("applications").insert({
      user_id: user.id,
      type: type.slug as any,
      mc_username: a.data.mc_username,
      discord: a.data.discord || null,
      age: a.data.age ? parseInt(a.data.age, 10) : null,
      timezone: a.data.timezone || null,
      experience: s.data.experience || null,
      why: s.data.why,
      portfolio_url: s.data.portfolio_url || null,
    }).select("id").single();
    setSubmitting(false);
    if (error) return toast.error(error.message);

    const appId = inserted?.id;
    const common = {
      mcUsername: a.data.mc_username,
      applicationType: type.slug,
      discord: a.data.discord || "",
      age: a.data.age || "",
      timezone: a.data.timezone || "",
      experience: s.data.experience || "",
      why: s.data.why,
      portfolioUrl: s.data.portfolio_url || "",
    };
    const applicationsFrom = "Warden Network Applications <applications@warden.rip>";
    if (user.email) {
      supabase.functions.invoke("send-app-email", {
        body: {
          templateName: "application-received",
          recipientEmail: user.email,
          idempotencyKey: `application-received-${appId}`,
          from: applicationsFrom,
          templateData: common,
        },
      }).catch(() => {});
    }
    supabase.functions.invoke("send-app-email", {
      body: {
        templateName: "application-admin",
        idempotencyKey: `application-admin-${appId}`,
        from: applicationsFrom,
        templateData: {
          ...common,
          adminUrl: `${window.location.origin}/admin?tab=applications`,
        },
      },
    }).catch(() => {});

    if (appId) {
      supabase.functions.invoke("notify-application-discord", {
        body: { applicationId: appId },
      }).catch(() => {});
    }

    toast.success("Application submitted! We'll review it soon.");
    navigate("/");
  };

  if (authLoading || (!type && !typeError)) {
    return (
      <Shell>
        <div className="container max-w-4xl flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  if (typeError) {
    return (
      <Shell>
        <Card className="container max-w-4xl p-10 text-center space-y-4">
          <h1 className="font-display text-2xl font-bold">Not found</h1>
          <p className="text-muted-foreground">{typeError}</p>
          <Button onClick={onBack}>Back to applications</Button>
        </Card>
      </Shell>
    );
  }

  if (!type) return null;
  const Icon = getIcon(type.icon);

  if (!type.accepting) {
    return (
      <Shell>
        <Card className="container max-w-4xl p-10 text-center space-y-4">
          <Icon className="h-10 w-10 mx-auto text-primary" />
          <h1 className="font-display text-2xl font-bold">{type.label} applications are closed</h1>
          <p className="text-muted-foreground">Check back later — we'll reopen soon.</p>
          <Button onClick={onBack}>Back to applications</Button>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <SEO
        title={`Apply as ${type.label}`}
        description={type.description}
        path={`/apply/${type.slug}`}
      />
      <section className="aurora border-b border-border/60 mb-10">
        <div className="container max-w-4xl py-10 md:py-14">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> All applications
          </button>
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-accent">WardenMC · {type.label} Application</div>
          <h1 className="font-display text-6xl leading-none md:text-7xl">
            APPLY AS <span className="text-gradient">{type.label.toUpperCase()}</span>
          </h1>
          <p className="mt-3 text-base text-muted-foreground md:text-lg">{type.intro || type.description}</p>
        </div>
      </section>
      <div className="container max-w-4xl">
      <ol className="flex items-center justify-between mb-8 gap-2">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={label} className="flex-1 flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  "h-8 w-8 shrink-0 rounded-full grid place-items-center text-xs font-bold border transition",
                  done && "bg-primary border-primary text-primary-foreground",
                  active && "border-primary text-primary",
                  !done && !active && "border-border text-muted-foreground"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-xs sm:text-sm truncate",
                  active ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={cn("h-px flex-1 mx-1", done ? "bg-primary" : "bg-border")} />
              )}
            </li>
          );
        })}
      </ol>

      <Card className="p-6 space-y-5">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-display font-bold text-lg">About you</h2>
              <p className="text-sm text-muted-foreground">Basic details so we can reach out.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mc">Minecraft username *</Label>
                <Input
                  id="mc"
                  value={form.mc_username}
                  onChange={(e) => setForm({ ...form, mc_username: e.target.value })}
                  placeholder="Notch"
                  maxLength={16}
                />
              </div>
              <div>
                <Label htmlFor="discord">Discord username</Label>
                <Input
                  id="discord"
                  value={form.discord}
                  onChange={(e) => setForm({ ...form, discord: e.target.value })}
                  placeholder="user#0000"
                  maxLength={64}
                />
              </div>
              <div>
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  min={10}
                  max={99}
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  placeholder="18"
                />
              </div>
              <div>
                <Label htmlFor="tz">Timezone</Label>
                <Input
                  id="tz"
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  placeholder="UTC, EST, PST..."
                  maxLength={64}
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-display font-bold text-lg">Your story</h2>
              <p className="text-sm text-muted-foreground">Tell us why you'd be a great fit.</p>
            </div>
            <div>
              <Label htmlFor="exp">Relevant experience</Label>
              <Textarea
                id="exp"
                value={form.experience}
                onChange={(e) => setForm({ ...form, experience: e.target.value })}
                placeholder="Past servers, communities, projects..."
                rows={4}
                maxLength={2000}
              />
            </div>
            <div>
              <Label htmlFor="why">Why do you want to join? *</Label>
              <Textarea
                id="why"
                value={form.why}
                onChange={(e) => setForm({ ...form, why: e.target.value })}
                placeholder="Tell us what motivates you..."
                rows={5}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground mt-1">{form.why.length}/2000</p>
            </div>
            {type.requires_portfolio && (
              <div>
                <Label htmlFor="portfolio">
                  {type.portfolio_label || "Portfolio URL"} *
                </Label>
                <Input
                  id="portfolio"
                  value={form.portfolio_url}
                  onChange={(e) => setForm({ ...form, portfolio_url: e.target.value })}
                  placeholder="https://..."
                  maxLength={500}
                />
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-display font-bold text-lg">Review & submit</h2>
              <p className="text-sm text-muted-foreground">Make sure everything looks right.</p>
            </div>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Row label="Role" value={type.label} />
              <Row label="Minecraft" value={form.mc_username} />
              <Row label="Discord" value={form.discord || "—"} />
              <Row label="Age" value={form.age || "—"} />
              <Row label="Timezone" value={form.timezone || "—"} />
              {form.portfolio_url && <Row label="Portfolio" value={form.portfolio_url} />}
            </dl>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Why</div>
              <p className="text-sm whitespace-pre-wrap rounded-md border border-border p-3 bg-muted/30">
                {form.why || "—"}
              </p>
            </div>
            {form.experience && (
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Experience</div>
                <p className="text-sm whitespace-pre-wrap rounded-md border border-border p-3 bg-muted/30">
                  {form.experience}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="ghost" onClick={back} disabled={step === 0 || submitting}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next} size="lg">
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={submitting} size="lg" className="glow">
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Submit application
            </Button>
          )}
        </div>
      </Card>
      </div>
    </Shell>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className="font-medium break-words">{value}</dd>
  </div>
);

const partnerSchema = z.object({
  server_name: z.string().trim().min(2, "Server name is required").max(80),
  server_url: z.string().trim().min(3, "Server IP or website is required").max(200),
  discord: z.string().trim().min(2, "Discord contact is required").max(64),
  advertisement: z.string().trim().min(30, "Write a short advertisement (min 30 chars)").max(2000),
  why: z.string().trim().min(30, "Tell us why you want to partner (min 30 chars)").max(2000),
});

const PartnerApplyForm = ({
  types,
  onBack,
}: {
  types: ApplicationType[] | null;
  onBack: () => void;
}) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState<ApplicationType | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [profileMc, setProfileMc] = useState<string>("");
  const [form, setForm] = useState({
    server_name: "",
    server_url: "",
    discord: "",
    advertisement: "",
    why: "",
  });

  useEffect(() => {
    if (types) {
      const found = types.find((t) => t.slug === "partner") ?? null;
      if (!found) {
        supabase
          .from("application_types" as any)
          .select("*")
          .eq("slug", "partner")
          .eq("enabled", true)
          .maybeSingle()
          .then(({ data }) => {
            if (!data) setTypeError("Partner applications aren't available right now.");
            else setType((data as unknown) as ApplicationType);
          });
      } else {
        setType(found);
      }
    }
  }, [types]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(`/apply/partner`)}`);
      return;
    }
    supabase
      .from("profiles")
      .select("mc_username")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.mc_username) setProfileMc(data.mc_username);
      });
  }, [user, authLoading, navigate]);

  const submit = async () => {
    if (!user || !type) return;
    const r = partnerSchema.safeParse(form);
    if (!r.success) return toast.error(r.error.issues[0].message);
    setSubmitting(true);
    const mcFallback = profileMc || (user.email?.split("@")[0] || "partner").replace(/[^A-Za-z0-9_]/g, "").slice(0, 16).padEnd(3, "0");
    const { data: inserted, error } = await supabase.from("applications").insert({
      user_id: user.id,
      type: "partner" as any,
      mc_username: mcFallback,
      discord: r.data.discord,
      experience: r.data.advertisement,
      why: r.data.why,
      portfolio_url: r.data.server_url,
      extra: { server_name: r.data.server_name, server_url: r.data.server_url, advertisement: r.data.advertisement } as any,
    }).select("id").single();
    setSubmitting(false);
    if (error) return toast.error(error.message);

    const appId = inserted?.id;
    const applicationsFrom = "Warden Network Applications <applications@warden.rip>";
    const common = {
      mcUsername: mcFallback,
      applicationType: "partner",
      discord: r.data.discord,
      age: "",
      timezone: "",
      experience: r.data.advertisement,
      why: r.data.why,
      portfolioUrl: r.data.server_url,
      serverName: r.data.server_name,
    };
    if (user.email) {
      supabase.functions.invoke("send-app-email", {
        body: {
          templateName: "application-received",
          recipientEmail: user.email,
          idempotencyKey: `application-received-${appId}`,
          from: applicationsFrom,
          templateData: common,
        },
      }).catch(() => {});
    }
    supabase.functions.invoke("send-app-email", {
      body: {
        templateName: "application-admin",
        idempotencyKey: `application-admin-${appId}`,
        from: applicationsFrom,
        templateData: { ...common, adminUrl: `${window.location.origin}/admin?tab=applications` },
      },
    }).catch(() => {});
    if (appId) {
      supabase.functions.invoke("notify-application-discord", {
        body: { applicationId: appId },
      }).catch(() => {});
    }

    toast.success("Partner application submitted! We'll be in touch soon.");
    navigate("/");
  };

  if (authLoading || (!type && !typeError)) {
    return (
      <Shell>
        <div className="container max-w-4xl flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  if (typeError) {
    return (
      <Shell>
        <Card className="container max-w-4xl p-10 text-center space-y-4">
          <h1 className="font-display text-2xl font-bold">Not available</h1>
          <p className="text-muted-foreground">{typeError}</p>
          <Button onClick={onBack}>Back to applications</Button>
        </Card>
      </Shell>
    );
  }
  if (!type) return null;
  const Icon = getIcon(type.icon);

  if (!type.accepting) {
    return (
      <Shell>
        <Card className="container max-w-4xl p-10 text-center space-y-4">
          <Icon className="h-10 w-10 mx-auto text-primary" />
          <h1 className="font-display text-2xl font-bold">Partner applications are closed</h1>
          <p className="text-muted-foreground">Check back later — we'll reopen soon.</p>
          <Button onClick={onBack}>Back to applications</Button>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <SEO
        title="Become a Partner — Warden Network"
        description="Apply to become an official partner server."
        path="/apply/partner"
      />
      <section className="aurora border-b border-border/60 mb-10">
        <div className="container max-w-4xl py-10 md:py-14">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> All applications
          </button>
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-accent">WardenMC · Partner Application</div>
          <h1 className="font-display text-6xl leading-none md:text-7xl">
            BECOME A <span className="text-gradient">PARTNER</span>
          </h1>
          <p className="mt-3 text-base text-muted-foreground md:text-lg">
            {type.intro || "Tell us about your server and how you'd like to partner with us."}
          </p>
        </div>
      </section>
      <div className="container max-w-4xl">
      <Card className="p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="server_name">Server name *</Label>
            <Input
              id="server_name"
              value={form.server_name}
              onChange={(e) => setForm({ ...form, server_name: e.target.value })}
              placeholder="MyAwesome Network"
              maxLength={80}
            />
          </div>
          <div>
            <Label htmlFor="server_url">Server IP or Website *</Label>
            <Input
              id="server_url"
              value={form.server_url}
              onChange={(e) => setForm({ ...form, server_url: e.target.value })}
              placeholder="play.myserver.net or https://myserver.net"
              maxLength={200}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="discord">Discord contact *</Label>
            <Input
              id="discord"
              value={form.discord}
              onChange={(e) => setForm({ ...form, discord: e.target.value })}
              placeholder="username or invite link"
              maxLength={64}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="advertisement">Your advertisement *</Label>
          <Textarea
            id="advertisement"
            value={form.advertisement}
            onChange={(e) => setForm({ ...form, advertisement: e.target.value })}
            placeholder="Write the pitch you'd like us to feature — gamemodes, unique features, player count, community vibe..."
            rows={6}
            maxLength={2000}
          />
          <p className="text-xs text-muted-foreground mt-1">{form.advertisement.length}/2000</p>
        </div>

        <div>
          <Label htmlFor="why">Why partner with us? *</Label>
          <Textarea
            id="why"
            value={form.why}
            onChange={(e) => setForm({ ...form, why: e.target.value })}
            placeholder="How does a partnership benefit both communities?"
            rows={5}
            maxLength={2000}
          />
          <p className="text-xs text-muted-foreground mt-1">{form.why.length}/2000</p>
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="ghost" onClick={onBack} disabled={submitting}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button onClick={submit} disabled={submitting} size="lg" className="glow">
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Submit partner application
          </Button>
        </div>
      </Card>
      </div>
    </Shell>
  );
};

export default Apply;
