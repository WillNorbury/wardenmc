import { supabase } from "@/integrations/supabase/client";

/**
 * plugin-jars is a private bucket. Jar files are served through a short-lived
 * signed URL issued by the plugin-file-url edge function, which verifies the
 * plugin is published (or that the requester owns / administers it).
 */
export function isInternalJarUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("/storage/v1/object/") && url.includes("/plugin-jars/");
}

export async function getJarDownloadUrl(
  pathOrUrl: string | null | undefined,
): Promise<string | null> {
  if (!pathOrUrl) return null;
  // External links (GitHub, Modrinth, etc.) are used as-is.
  if (/^https?:\/\//i.test(pathOrUrl) && !isInternalJarUrl(pathOrUrl)) return pathOrUrl;

  const { data, error } = await supabase.functions.invoke("plugin-file-url", {
    body: { path: pathOrUrl },
  });
  if (error || !data?.url) return null;
  return data.url as string;
}

/**
 * Resolves a download URL for a plugin version without exposing the internal
 * storage path — the edge function looks the jar up server-side by version id.
 * Use this for anonymous/public downloads where jar_path is not visible.
 */
export async function getVersionJarDownloadUrl(
  versionId: string | null | undefined,
): Promise<string | null> {
  if (!versionId) return null;
  const { data, error } = await supabase.functions.invoke("plugin-file-url", {
    body: { version_id: versionId },
  });
  if (error || !data?.url) return null;
  return data.url as string;
}

// Resolve main files server-side as well, so paid access checks apply to links
// returned by the website regardless of whether the file is stored here.
export async function getPluginJarDownloadUrl(pluginId: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("plugin-file-url", { body: { plugin_id: pluginId } });
  return error || !data?.url ? null : data.url as string;
}
