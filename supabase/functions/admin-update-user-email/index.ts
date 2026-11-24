// Admin-only edge function to fetch or update a user's auth email
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json(401, { error: "Unauthorized" });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verify caller is admin or owner
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "owner"]);
    if (!roleRows || roleRows.length === 0) return json(403, { error: "Forbidden" });

    const body = await req.json().catch(() => ({}));
    const { user_id, email } = (body ?? {}) as { user_id?: string; email?: string };
    if (!user_id) return json(400, { error: "user_id required" });

    // GET-style: no email provided -> return current
    if (typeof email === "undefined" || email === null) {
      const { data, error } = await admin.auth.admin.getUserById(user_id);
      if (error) return json(400, { error: error.message });
      return json(200, { ok: true, email: data.user?.email ?? null });
    }

    // Update path
    const trimmed = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed) || trimmed.length > 255) {
      return json(400, { error: "Invalid email address" });
    }

    // Capture the previous email so we can notify the old address too
    const { data: existing } = await admin.auth.admin.getUserById(user_id);
    const previousEmail = existing.user?.email ?? null;

    const { data: updated, error: updateErr } = await admin.auth.admin.updateUserById(user_id, {
      email: trimmed,
      email_confirm: true,
    });
    if (updateErr) return json(400, { error: updateErr.message });

    // Fire-and-forget security notification to both the new and old addresses
    // so the account owner can see the change land in their inbox.
    const notify = async (recipient: string) => {
      try {
        await admin.functions.invoke("send-app-email", {
          body: {
            templateName: "email-changed",
            recipientEmail: recipient,
            idempotencyKey: `email-changed-${user_id}-${Date.now()}-${recipient}`,
            templateData: {
              oldEmail: previousEmail ?? "(unknown)",
              newEmail: trimmed,
              changedBy: "a Warden Network administrator",
            },
          },
        });
      } catch (_) {
        // Non-fatal — the email change itself already succeeded.
      }
    };
    // Only notify the account's previous (verified) address, never an admin-chosen one.
    if (previousEmail && previousEmail.toLowerCase() !== trimmed) await notify(previousEmail);

    return json(200, { ok: true, email: updated.user?.email ?? trimmed });
  } catch (e) {
    return json(500, { error: (e as Error).message });
  }
});
