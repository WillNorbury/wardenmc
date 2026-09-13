import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import logo from "@/assets/warden-network-icon.png";
import { Link } from "react-router-dom";
import { SEO } from "@/components/site/SEO";
import { Mail, Loader2, ShieldCheck, KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { trackFunnelEvent } from "@/lib/funnel";

const schema = z.object({
  email: z.string().email("Invalid email").max(255),
  password: z.string().min(8, "Min 8 characters").max(72),
  displayName: z.string().trim().min(2).max(40).optional(),
});

type Mode = "signin" | "signup" | "verify" | "mfa";

const Auth = () => {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get("next") ?? "";
  // Only accept same-origin relative paths (e.g. "/.lovable/oauth/consent?...").
  const safeNext = useMemo(() => (nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/"), [nextParam]);
  const goNext = () => {
    if (safeNext === "/") nav("/");
    else window.location.href = safeNext;
  };
  const { user } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // Funnel: record each time a visitor lands on the sign-up form.
  useEffect(() => {
    if (mode === "signup") trackFunnelEvent("signup_view");
  }, [mode]);

  useEffect(() => {
    if (!user) return;
    if (mode === "mfa") return;
    let cancelled = false;
    (async () => {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (cancelled) return;
      if (aal?.currentLevel === "aal1" && aal.nextLevel === "aal2") {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totp = factors?.totp?.find((f) => f.status === "verified");
        if (totp) {
          setMfaFactorId(totp.id);
          setMode("mfa");
          return;
        }
      }
      goNext();

    })();
    return () => { cancelled = true; };
  }, [user, nav, mode]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // After a successful password sign-in, check if the user has a verified
  // TOTP factor and the session needs to be elevated to AAL2.
  const checkMfaAfterSignIn = async (): Promise<boolean> => {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal1" && aal.nextLevel === "aal2") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.find((f) => f.status === "verified");
      if (totp) {
        setMfaFactorId(totp.id);
        setMode("mfa");
        return true;
      }
    }
    return false;
  };

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, displayName: mode === "signup" ? displayName : undefined });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}${safeNext}`,
            data: { display_name: displayName },
          },
        });
        if (error) throw error;
        trackFunnelEvent("signup_complete");
        setOtp("");
        setMode("verify");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const needsMfa = await checkMfaAfterSignIn();
        if (!needsMfa) {
          toast.success("Welcome back");
          goNext();
        }

      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code from your email");
      return;
    }
    setVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "signup",
      });
      if (error) throw error;
      toast.success("Email verified — welcome!");
      goNext();

    } catch (err: any) {
      toast.error(err.message ?? "Invalid or expired code");
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!mfaFactorId || mfaCode.length !== 6) {
      toast.error("Enter the 6-digit code from your authenticator app");
      return;
    }
    setMfaVerifying(true);
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (cErr) throw cErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code: mfaCode,
      });
      if (vErr) throw vErr;
      toast.success("Welcome back");
      goNext();

    } catch (err: any) {
      toast.error(err.message ?? "Invalid authenticator code");
    } finally {
      setMfaVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}${safeNext}` },
      });
      if (error) throw error;
      toast.success("Verification code resent — check your inbox");
      setResendCooldown(60);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to resend email");
    } finally {
      setResendLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().email().max(255).safeParse(forgotEmail);
    if (!parsed.success) {
      toast.error("Enter a valid email address");
      return;
    }
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setForgotSent(true);
      toast.success("Reset link sent — check your inbox");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send reset email");
    } finally {
      setForgotLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-grid">
      <SEO
        title="Sign in — Warden Network"
        description="Sign in or create your Warden Network account to apply for staff, vote, manage your profile, and access the dashboard."
        path="/auth"
      />
      <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
      <Card className="w-full max-w-md p-8 backdrop-blur-xl bg-card/90 border-primary/20 shadow-elegant">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <img src={logo} alt="Warden Network" className="h-12 w-12 object-contain" />
          <span className="font-bold text-xl">Warden<span className="text-primary"> Network</span></span>
        </Link>

        {mode === "verify" ? (
          <div className="text-center space-y-6">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-7 h-7 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Enter your verification code</h2>
              <p className="text-sm text-muted-foreground">
                We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>.
              </p>
            </div>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="space-y-3">
              <Button className="w-full" onClick={handleVerifyOtp} disabled={verifying || otp.length !== 6}>
                {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Verify email
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResend}
                disabled={resendLoading || resendCooldown > 0}
              >
                {resendLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setMode("signin")}>
                Back to sign in
              </Button>
            </div>
          </div>
        ) : mode === "mfa" ? (
          <div className="text-center space-y-6">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Two-factor authentication</h2>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app.
              </p>
            </div>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={mfaCode} onChange={setMfaCode}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button className="w-full" onClick={handleVerifyMfa} disabled={mfaVerifying || mfaCode.length !== 6}>
              {mfaVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verify
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={async () => {
                await supabase.auth.signOut();
                setMode("signin");
                setMfaCode("");
                setMfaFactorId(null);
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList className="grid grid-cols-2 w-full mb-5">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>


            <form onSubmit={handle} className="space-y-4">
              <TabsContent value="signup" className="space-y-4 mt-0">
                <div>
                  <Label htmlFor="dn">Display name</Label>
                  <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Steve" />
                </div>
              </TabsContent>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="pw">Password</Label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => { setForgotEmail(email); setForgotSent(false); setForgotOpen(true); }}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>
          </Tabs>
        )}
      </Card>

      <Dialog open={forgotOpen} onOpenChange={(o) => { setForgotOpen(o); if (!o) setForgotSent(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" /> Reset your password
            </DialogTitle>
            <DialogDescription>
              {forgotSent
                ? "If an account exists for that email, a reset link has been sent from passwords@warden.rip. Check your inbox (and spam folder)."
                : "Enter your account email and we'll send you a password reset link."}
            </DialogDescription>
          </DialogHeader>
          {!forgotSent ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <Label htmlFor="fpw-email">Email</Label>
                <Input
                  id="fpw-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setForgotOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={forgotLoading}>
                  {forgotLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Send reset link
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <DialogFooter>
              <Button onClick={() => setForgotOpen(false)} className="w-full">Done</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
