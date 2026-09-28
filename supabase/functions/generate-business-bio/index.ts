import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-6-astra";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Please sign in." }, 401);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: claims, error: authErr } = await supabase.auth.getClaims(auth.slice(7));
  if (authErr || !claims?.claims?.sub) return json({ error: "Please sign in." }, 401);
  const { data: profile } = await supabase.from("profiles").select("account_type").eq("id", claims.claims.sub).maybeSingle();
  if (profile?.account_type !== "business") return json({ error: "Only business accounts can generate a bio." }, 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }
  const name = clip(body.name, 80);
  const category = clip(body.category, 60);
  const details = clip(body.details, 1500);
  const website = clip(body.website, 200);
  const tone = clip(body.tone, 30) || "professional";
  if (!name || !details) return json({ error: "Add your business name and a few details first." }, 400);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "AI is not configured." }, 500);

  const prompt = `Write a polished public profile bio for a business on Warden Network (a Minecraft community site).
Business name: ${name}
Category: ${category || "not specified"}
Website: ${website || "none"}
Tone: ${tone}
Details from the owner:
${details}

Rules: 1-3 sentences, under 280 characters total, no hashtags, no emojis, no invented facts, no quotation marks. Return only the bio text.`;

  const res = await fetch(GATEWAY, {
    method: "POST",
    signal: req.signal,
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: MODEL,
      input: prompt,
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
    }),
  });

  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    console.error("AI gateway error", res.status, t.slice(0, 500));
    let msg = "Could not generate a bio right now.";
    try { msg = JSON.parse(t)?.error?.message ?? JSON.parse(t)?.message ?? msg; } catch { /* keep */ }
    if (res.status === 429) msg = "Too many requests — please try again in a moment.";
    if (res.status === 402) msg = "AI credits have run out. Please contact the site owner.";
    return json({ error: msg }, res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "", text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const ev = JSON.parse(data);
        if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") text += ev.delta;
        if (ev.type === "response.failed" || ev.type === "error") {
          console.error("AI stream error", data.slice(0, 500));
          return json({ error: "Could not generate a bio right now." }, 502);
        }
      } catch { /* partial */ }
    }
  }
  const bio = text.trim().replace(/^["']|["']$/g, "").slice(0, 500);
  if (!bio) return json({ error: "The AI didn't return a bio. Try adding more details." }, 502);
  return json({ bio });
});
