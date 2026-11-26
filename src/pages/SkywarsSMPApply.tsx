import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SEO } from "@/components/site/SEO";
import { toast } from "sonner";
import { CheckCircle2, Info, Loader2, Send } from "lucide-react";
import type { ApplicationType } from "./Apply";

const PATH = "/skywarssmp/apply";

const NOTES = [
  "Asking staff about the status of an application may result in denial",
  "Applications are typically reviewed within approximately two weeks",
  "AI-generated application responses are not permitted",
  "Final decisions are made by the staff team",
];

const REQUIREMENTS = [
  "Own a working microphone and be able to join voice chat",
  "Be 13 years old or older",
  "Have Two-Factor Authentication (2FA) enabled on Discord and Minecraft",
  "Be able to record and screenshot in-game evidence",
  "Demonstrate maturity and professionalism",
  "Be active within the SkywarsSMP community",
  "Not currently hold a staff position on another Minecraft server network",
  "Have a good understanding of server gameplay and rules",
  "Have Discord linked to their SkywarsSMP account",
  "Must be able to commit to a minimum of 14 hours per week as a staff member",
];

const empty = {
  mc_username: "", age: "", timezone: "", experience: "", why: "",
  qualities: "", hours: "", scenarios: "", extra: "",
};

const Field = ({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-semibold">
      {label} {required && <span className="text-destructive">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const SkywarsSMPApply = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [types, setTypes] = useState<ApplicationType[]>([]);
  const [category, setCategory] = useState("skywarssmp");
  const [form, setForm] = useState(empty);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    supabase.from("application_types" as any).select("*").eq("enabled", true).eq("accepting", true)
      .order("sort_order").then(({ data }) =>
        setTypes((((data ?? []) as unknown) as ApplicationType[]).filter((t) => t.slug !== "partner")));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate(`/auth?redirect=${encodeURIComponent(PATH)}`); return; }
    supabase.from("profiles").select("mc_username").eq("id", user.id).maybeSingle()
      .then(({ data }) => data?.mc_username && setForm((f) => ({ ...f, mc_username: data.mc_username! })));
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const f = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])) as typeof empty;
    if (!/^[A-Za-z0-9_]{3,16}$/.test(f.mc_username)) return toast.error("Enter a valid Minecraft username.");
    if (!/^\d+$/.test(f.age) || +f.age < 13 || +f.age > 99) return toast.error("Enter a valid age (13+).");
    if (!f.timezone) return toast.error("Enter your region / timezone.");
    if (f.why.length < 30) return toast.error("Tell us more about why you want to join (min 30 characters).");
    if (!f.qualities || !f.hours || !f.scenarios) return toast.error("Please answer every required question.");
    if (!agree) return toast.error("Please confirm you meet the requirements.");

    const why = `${f.why}\n\nWhat makes me stand out:\n${f.qualities}`;
    const experience = [
      f.experience && `Previous staff experience:\n${f.experience}`,
      `Hours per week: ${f.hours}`,
      `Scenarios:\n${f.scenarios}`,
      f.extra && `Additional information:\n${f.extra}`,
    ].filter(Boolean).join("\n\n");

    setSubmitting(true);
    const { data, error } = await supabase.from("applications").insert({
      user_id: user.id, type: category as any, mc_username: f.mc_username,
      age: parseInt(f.age, 10), timezone: f.timezone, experience, why,
    }).select("id").single();
    setSubmitting(false);
    if (error) return toast.error(error.message);

    const appId = data?.id;
    const common = { mcUsername: f.mc_username, applicationType: category, discord: "", age: f.age, timezone: f.timezone, experience, why, portfolioUrl: "" };
    const from = "Warden Network Applications <applications@warden.rip>";
    if (user.email) supabase.functions.invoke("send-app-email", { body: { templateName: "application-received", recipientEmail: user.email, idempotencyKey: `application-received-${appId}`, from, templateData: common } }).catch(() => {});
    supabase.functions.invoke("send-app-email", { body: { templateName: "application-admin", idempotencyKey: `application-admin-${appId}`, from, templateData: { ...common, adminUrl: `${window.location.origin}/admin?tab=applications` } } }).catch(() => {});
    if (appId) supabase.functions.invoke("notify-application-discord", { body: { applicationId: appId } }).catch(() => {});
    toast.success("Application submitted! We'll review it soon.");
    navigate(appId ? `/applications/${appId}` : "/applications");
  };

  const options = types.some((t) => t.slug === "skywarssmp") ? types : [{ slug: "skywarssmp", label: "SkywarsSMP" } as ApplicationType, ...types];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title="Apply for SkywarsSMP Staff" description="Apply to join the SkywarsSMP staff team." path={PATH} />
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <form onSubmit={submit} className="container max-w-3xl space-y-6">
          <div>
            <h1 className="font-display text-3xl font-bold">Apply for Staff</h1>
            <p className="text-sm text-muted-foreground mt-1">Answer every question honestly and with as much detail as you can.</p>
          </div>

          <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-2">
            {NOTES.map((n) => (
              <div key={n} className="flex items-start gap-2 text-sm">
                <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> {n}
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-card p-5 space-y-5">
            <Field label="Which category are you applying for?" required>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {options.map((t) => <SelectItem key={t.slug} value={t.slug}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Minecraft In-Game Name (IGN)" required hint="Max 16 characters.">
              <Input value={form.mc_username} onChange={set("mc_username")} maxLength={16} />
            </Field>
            <Field label="Age" required hint="Must be 13 or older.">
              <Input type="number" min={13} max={99} value={form.age} onChange={set("age")} />
            </Field>
            <Field label="Region / Timezone" required>
              <Input value={form.timezone} onChange={set("timezone")} maxLength={64} />
            </Field>
            <Field label="Previous Staff Experience">
              <Textarea rows={2} value={form.experience} onChange={set("experience")} maxLength={1000} />
            </Field>
            <Field label="Why do you want to become a staff member on SkywarsSMP?" required>
              <Textarea rows={2} value={form.why} onChange={set("why")} maxLength={1000} />
            </Field>
            <Field label="What qualities or skills make you stand out from other applicants?" required>
              <Textarea rows={2} value={form.qualities} onChange={set("qualities")} maxLength={800} />
            </Field>
            <Field label="How many hours per week can you commit to SkywarsSMP?" required>
              <Input value={form.hours} onChange={set("hours")} maxLength={64} />
            </Field>
            <Field label="How would you handle the following scenarios?" required hint="A friend breaking the rules, a staff member breaking the rules, a player arguing with staff.">
              <Textarea rows={2} value={form.scenarios} onChange={set("scenarios")} maxLength={1000} />
            </Field>
            <Field label="Any additional information or questions?">
              <Textarea rows={2} value={form.extra} onChange={set("extra")} maxLength={500} />
            </Field>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <h2 className="font-semibold">Requirements</h2>
            {REQUIREMENTS.map((r) => (
              <div key={r} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> {r}
              </div>
            ))}
          </div>

          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <Checkbox checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5" />
            I confirm that I meet all of the requirements above and that my answers are truthful.
          </label>

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting || !agree}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Submit Application
            </Button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default SkywarsSMPApply;
