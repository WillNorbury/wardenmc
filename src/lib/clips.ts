export const CLIP_MAX_BYTES = 50 * 1024 * 1024;
export const CLIP_BUCKET = "community-clips";

export function validateClip(file: { name: string; size: number }, title: string) {
  if (!title.trim() || title.trim().length > 120) return "Enter a title between 1 and 120 characters.";
  if (!/\.(mp4|webm|mov)$/i.test(file.name)) return "Choose an MP4, WebM or MOV video.";
  if (file.size === 0) return "This video file is empty.";
  if (file.size > CLIP_MAX_BYTES) return "Videos must be 50 MB or smaller.";
  return null;
}

export function clipStoragePath(userId: string, id: string, filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (!extension || !["mp4", "webm", "mov"].includes(extension)) throw new Error("Unsupported video format");
  return `${userId}/${id}.${extension}`;
}