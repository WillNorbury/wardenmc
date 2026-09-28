import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Briefcase, Loader2, Sparkles, User } from "lucide-react";

export const BUSINESS_CATEGORIES = [
  "Minecraft server", "Content creator", "Development studio", "Build team", "Hosting", "Design & art", "Esports", "Shop / Store", "Other",
];

type Props = { userId: string; displayName: string };

const BusinessProfileCard = ({ userId, displayName }: Props) => {
  const [loading, setLoading] = useState(true);
  const [accountType, setAccountType] = useState<"personal" | "business">("personal");
  const [website, setWebsite] = useState("");
  const [contact, setContact] = useState("");
  const [category, setCategory] = useState("");
  const [bio, setBio] = useState("");
  const [details, setDetails] = useState("");
  const [tone, setTone] = useState("professional");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("account_type, business_website, business_contact, business_category, bio")
        .eq("id", userId).maybeSingle();
      setAccountType(data?.account_type === "business" ? "business" : "personal");
      setWebsite(data?.business_website ?? "");
      setContact(data?.business_contact ?? "");
      setCategory(data?.business_category ?? "");
      setBio(data?.bio ?? "");
      setLoading(false);
    })();
  }, [userId]);

  const save = async () => {
    let site = website.trim();
    if (site && !/^https?:\/\//i.test(site)) site = `https://${site}`;
    if (site) { try { new URL(site); } catch { return toast.error("Website doesn't look like a valid address."); } }
    setSaving(true);
    const { error } = await (supabase as any).from("profiles").update({
      account_type: accountType,
      business_website: site || null,
      business_contact: contact.trim() || null,
      business_category: category || null,
      bio: bio.trim() || null,
    }).eq("id", userId);
    setSaving(false);
    if (error) return toast.error(error.message);
    setWebsite(site);
    toast.success(accountType === "business" ? "Business profile saved" : "Account type saved");
  };

  const generate = async () => {
    if (!details.trim()) return toast.error("Describe your business first.");
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("generate-business-bio", {
      body: { name: displayName, category, website, details, tone },
    });
    setGenerating(false);
    if (error || !data?.bio) {
      let msg = data?.error;
      try { msg = msg ?? (await (error as any)?.context?.json())?.error; } catch { /* ignore */ }
      return toast.error(msg || "Could not generate a bio.");
    }
    setBio(data.bio);
    toast.success("Bio generated — review it, then save.");
  };

  if (loading) return null;
  const isBusiness = accountType === "business";

  return (
    <Card className="p-6 mt-6 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Briefcase className="h-5 w-5 text-primary" />
          <h2 className="font-display font-bold text-lg">Account type</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">Switch between a personal and a business account at any time.</p>
        <RadioGroup value={accountType} onValueChange={(v) => setAccountType(v as "personal" | "business")} className="grid grid-cols-2 gap-3 max-w-md">
          {([["personal", "Personal", User], ["business", "Business", Briefcase]] as const).map(([v, label, Icon]) => (
            <Label key={v} htmlFor={`acct-${v}`} className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer ${accountType === v ? "border-primary bg-primary/10" : "border-border"}`}>
              <RadioGroupItem id={`acct-${v}`} value={v} />
              <Icon className="h-4 w-4" /> {label}
            </Label>
          ))}
        </RadioGroup>
      </div>

      {isBusiness && (
        <div className="grid gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="biz_category">Business category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="biz_category"><SelectValue placeholder="Choose a category" /></SelectTrigger>
                <SelectContent>{BUSINESS_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="biz_website">Website</Label>
              <Input id="biz_website" value={website} maxLength={200} onChange={(e) => setWebsite(e.target.value)} placeholder="example.com" />
            </div>
          </div>
          <div>
            <Label htmlFor="biz_contact">Contact</Label>
            <Input id="biz_contact" value={contact} maxLength={200} onChange={(e) => setContact(e.target.value)} placeholder="Email, Discord invite, or phone" />
            <p className="text-xs text-muted-foreground mt-1">Shown publicly on your profile so visitors can reach you.</p>
          </div>

          <div className="rounded-md border border-border p-4 space-y-3 bg-muted/30">
            <div className="flex items-center gap-2 font-medium"><Sparkles className="h-4 w-4 text-primary" /> AI bio writer</div>
            <Textarea value={details} maxLength={1500} onChange={(e) => setDetails(e.target.value)} rows={4}
              placeholder="What does your business do? Who is it for? What makes it stand out?" />
            <div className="flex flex-wrap items-center gap-3">
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["professional", "friendly", "bold", "playful"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t[0].toUpperCase() + t.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" variant="secondary" onClick={generate} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate bio
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="biz_bio">Profile bio</Label>
            <Textarea id="biz_bio" value={bio} maxLength={500} onChange={(e) => setBio(e.target.value)} rows={3} />
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Save
        </Button>
      </div>
    </Card>
  );
};

export default BusinessProfileCard;
