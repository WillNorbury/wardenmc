import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const SKYWARSSMP_CONTENT_KEY = "skywarssmp_page";

export type SkywarsSMPContent = {
  server_ip: string;
  join_command: string;
  tagline: string;
  description: string;
  join_steps: string[];
};

export const DEFAULT_SKYWARSSMP_CONTENT: SkywarsSMPContent = {
  server_ip: "play.warden.rip",
  join_command: "/joinqueue SkywarsSMP",
  tagline: "SkywarsSMP on Warden Network",
  description: "Connect to Warden Network, then enter the SkywarsSMP queue to start playing.",
  join_steps: [
    "Open Minecraft and add Warden Network using the server address above.",
    "Join the network, then open the in-game chat.",
    "Enter the SkywarsSMP queue command shown below.",
    "Wait for the queue to connect you to SkywarsSMP.",
  ],
};

export const skywarsSMPContentSchema = z.object({
  server_ip: z
    .string()
    .trim()
    .max(253)
    .refine((value) => !value || /^[A-Za-z0-9.-]+(?::[0-9]{1,5})?$/.test(value), "Enter a server address without https://"),
  join_command: z.string().trim().min(2).max(120).regex(/^\/[^\r\n]+$/, "Enter one in-game command starting with /"),
  tagline: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(500),
  join_steps: z.array(z.string().trim().min(3).max(240)).min(1).max(8),
});

export function parseSkywarsSMPContent(value: unknown): SkywarsSMPContent {
  const saved = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const parsed = skywarsSMPContentSchema.safeParse({ ...DEFAULT_SKYWARSSMP_CONTENT, ...saved });
  return parsed.success ? (parsed.data as SkywarsSMPContent) : DEFAULT_SKYWARSSMP_CONTENT;
}

export async function fetchSkywarsSMPContent(): Promise<SkywarsSMPContent> {
  const { data, error } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", SKYWARSSMP_CONTENT_KEY)
    .maybeSingle();
  if (error) throw error;
  return parseSkywarsSMPContent(data?.value);
}

export async function saveSkywarsSMPContent(content: SkywarsSMPContent) {
  const parsed = skywarsSMPContentSchema.safeParse(content);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the page content" };
  const { error } = await supabase
    .from("site_content")
    .upsert({ key: SKYWARSSMP_CONTENT_KEY, value: parsed.data as never }, { onConflict: "key" });
  return { error: error?.message ?? null };
}
