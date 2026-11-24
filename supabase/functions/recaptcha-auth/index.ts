import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const Body = z.object({
  action: z.enum(["signin", "signup"]),
  token: z.string().min(10).max(4000),
  email: z.string().email().max(255),
  password: z.string().min(8).max(200),
  displayName: z.string().max(80).optional(),
  accountType: z.enum(["personal", "business"]).optional(),
  redirectTo: z.string().url().max(500).optional(),
});

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid request" }, 400);
  const b = parsed.data;

  const secret = Deno.env.get("RECAPTCHA_SECRET_KEY");
  if (!secret) return json({ error: "Captcha is not configured" }, 500);
  const verify = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: b.token }),
  }).then((r) => r.json()).catch(() => ({ success: false }));
  if (!verify.success) return json({ error: "Captcha check failed. Please try again." }, 403);

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_ANON_KEY")!;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  if (b.action === "signin") {
    const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST", headers, body: JSON.stringify({ email: b.email, password: b.password }),
    });
    const d = await r.json();
    if (!r.ok) return json({ error: d.msg ?? d.error_description ?? "Invalid login credentials" }, 400);
    return json({ access_token: d.access_token, refresh_token: d.refresh_token });
  }

  const redirect = b.redirectTo ? `?redirect_to=${encodeURIComponent(b.redirectTo)}` : "";
  const r = await fetch(`${url}/auth/v1/signup${redirect}`, {
    method: "POST", headers,
    body: JSON.stringify({
      email: b.email, password: b.password,
      data: { display_name: b.displayName ?? "", account_type: b.accountType ?? "personal" },
    }),
  });
  const d = await r.json();
  if (!r.ok) return json({ error: d.msg ?? d.error_description ?? "Sign up failed" }, 400);
  return json({ ok: true });
});
