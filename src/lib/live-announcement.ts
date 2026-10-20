import { z } from "zod";

export const LIVE_ANNOUNCEMENT_FROM = "streams@warden.rip";
export const liveAnnouncementSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  heading: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(4000),
  streamTitle: z.string().trim().max(200),
  streamUrl: z.string().url().refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  }, "Enter an HTTPS stream link without embedded credentials."),
  buttonLabel: z.string().trim().min(1).max(60),
});
export type LiveAnnouncementDraft = z.infer<typeof liveAnnouncementSchema>;
export const DEFAULT_LIVE_ANNOUNCEMENT: LiveAnnouncementDraft = {
  subject: "I'm live! Join WillNorbury on Twitch",
  heading: "I'm live!",
  message: "Hey everyone,\n\nI'm streaming now — come hang out, join the chat and watch with the Warden Network community.\n\nSee you there!\nWill Norbury",
  streamTitle: "",
  streamUrl: "https://www.twitch.tv/will_norbury",
  buttonLabel: "Watch live",
};

export function draftStorageKey(userId: string) {
  return `warden:live-announcement-draft:${userId}`;
}

export function readAnnouncementDraft(value: string | null): LiveAnnouncementDraft {
  try {
    const result = liveAnnouncementSchema.safeParse(JSON.parse(value ?? "null"));
    return result.success ? result.data : { ...DEFAULT_LIVE_ANNOUNCEMENT };
  } catch {
    return { ...DEFAULT_LIVE_ANNOUNCEMENT };
  }
}

export function buildAnnouncementText(draft: LiveAnnouncementDraft) {
  const data = liveAnnouncementSchema.parse(draft);
  return [data.heading, data.streamTitle, data.message, `${data.buttonLabel}: ${data.streamUrl}`, "Warden Network · https://warden.rip"].filter(Boolean).join("\n\n");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

export type EmailPalette = { background: string; panel: string; text: string; muted: string; primary: string; onPrimary: string; border: string };

export function buildAnnouncementHtml(draft: LiveAnnouncementDraft, palette: EmailPalette) {
  const data = liveAnnouncementSchema.parse(draft);
  const e = escapeHtml;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(data.subject)}</title></head>
<body style="margin:0;background:${e(palette.background)};color:${e(palette.text)};font-family:Arial,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:32px 16px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:auto;background:${e(palette.panel)};border:1px solid ${e(palette.border)}"><tr><td style="padding:32px">
<p style="color:${e(palette.primary)};font-size:13px;font-weight:bold">WARDEN NETWORK · LIVE</p>
<h1 style="font-size:36px;line-height:1.2;margin:24px 0">${e(data.heading)}</h1>
${data.streamTitle ? `<h2 style="font-size:20px">${e(data.streamTitle)}</h2>` : ""}
<p style="font-size:16px;line-height:1.7;white-space:pre-wrap">${e(data.message).replace(/\n/g, "<br>")}</p>
<p style="margin:32px 0"><a href="${e(data.streamUrl)}" style="display:inline-block;background:${e(palette.primary)};color:${e(palette.onPrimary)};padding:14px 24px;text-decoration:none;font-weight:bold;border-radius:4px">${e(data.buttonLabel)}</a></p>
<p style="font-size:13px;color:${e(palette.muted)}">Warden Network · <a style="color:${e(palette.muted)}" href="https://warden.rip">warden.rip</a></p>
</td></tr></table></td></tr></table></body></html>`;
}