import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getDeviceId } from "@/lib/deviceId";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type Status = "idle" | "checking" | "required" | "ok";

const okKey = (uid: string) => `cmc_dv_ok_${uid}`;

export const DeviceVerificationGate = ({ children }: { children: ReactNode }) => {
  const { session, loading } = useAuth();
  const uid = session?.user?.id ?? null;

  const [status, setStatus] = useState<Status>("idle");
  const [reason, setReason] = useState<"new_device" | "new_network" | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const checkedFor = useRef<string | null>(null);

  const runCheck = useCallback(
    async (action: "check" | "resend") => {
      const { data, error } = await supabase.functions.invoke("device-verify", {
        body: { action, device_id: getDeviceId() },
      });
      if (error) {
        // Fail open so a backend hiccup can never lock members out.
        console.error("[device-verify]", error);
        setStatus("ok");
        return;
      }
      if (data?.required) {
        setReason(data.reason ?? null);
        setMaskedEmail(data.email ?? null);
        setStatus("required");
      } else {
        if (uid) sessionStorage.setItem(okKey(uid), "1");
        setStatus("ok");
      }
    },
    [uid],
  );

  useEffect(() => {
    if (loading) return;
    if (!uid) {
      setStatus("idle");
      checkedFor.current = null;
      setCode("");
      return;
    }
    if (checkedFor.current === uid) return;
    checkedFor.current = uid;

    if (sessionStorage.getItem(okKey(uid)) === "1") {
      setStatus("ok");
      return;
    }
    setStatus("checking");
    runCheck("check");
  }, [uid, loading, runCheck]);

  const confirm = async () => {
    if (code.length !== 8) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("device-verify", {
      body: { action: "confirm", device_id: getDeviceId(), code, remember },
    });
    setSubmitting(false);
    if (error || !data?.ok) {
      const err = (data as any)?.error;
      toast.error(
        err === "expired"
          ? "That code expired — request a new one."
          : err === "too_many_attempts"
            ? "Too many attempts. Request a new code."
            : err === "no_pending_code"
              ? "No active code. Request a new one."
              : "Incorrect code. Try again.",
      );
      setCode("");
      return;
    }
    if (uid) sessionStorage.setItem(okKey(uid), "1");
    toast.success(
      data.remembered
        ? "Device verified — you'll stay signed in here for 30 days."
        : "Device verified.",
    );
    setStatus("ok");
  };

  const resend = async () => {
    setResending(true);
    await runCheck("resend");
    setResending(false);
    setCode("");
    toast.success("A new code is on its way.");
  };

  if (status !== "required") return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-primary/20 bg-card/80 backdrop-blur">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Verify this sign-in</CardTitle>
          <p className="text-sm text-muted-foreground">
            {reason === "new_network"
              ? "You're signing in from a new network."
              : "You're signing in from a new device."}{" "}
            We emailed an 8-digit code
            {maskedEmail ? <> to <span className="font-medium">{maskedEmail}</span></> : null}.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex justify-center">
            <InputOTP maxLength={8} value={code} onChange={setCode}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-border/60 p-3 text-sm cursor-pointer">
            <Checkbox
              checked={remember}
              onCheckedChange={(v) => setRemember(v === true)}
              className="mt-0.5"
            />
            <span>
              Keep me signed in on this device for 30 days
              <span className="block text-xs text-muted-foreground">
                We won't ask again on this device unless your network changes.
              </span>
            </span>
          </label>

          <Button className="w-full" onClick={confirm} disabled={submitting || code.length !== 8}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify and continue"}
          </Button>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={resend}
              disabled={resending}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <MailCheck className="h-3.5 w-3.5" /> Resend code
            </button>
            <button
              type="button"
              onClick={() => supabase.auth.signOut()}
              className="text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
