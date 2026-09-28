import { supabase } from "@/integrations/supabase/client";

const MAX_AVATAR_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "video/webm"];

export async function prepareAvatar(file: File): Promise<File> {
  if (!ACCEPTED_TYPES.includes(file.type)) throw new Error("Choose a PNG, JPG, WebP, or WebM file.");
  if (file.size > MAX_AVATAR_SIZE) throw new Error("Profile photos must be under 10 MB.");
  if (file.type !== "video/webm") return file;

  // Avatars throughout the site are images. Use a frame from a WebM clip as its photo.
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  try {
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("This WebM clip could not be read."));
      video.load();
    });
    const canvas = document.createElement("canvas");
    const side = Math.min(video.videoWidth, video.videoHeight);
    if (!side) throw new Error("This WebM clip has no visible frame.");
    canvas.width = canvas.height = Math.min(side, 512);
    canvas.getContext("2d")?.drawImage(video, (video.videoWidth - side) / 2, (video.videoHeight - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not create a photo from this clip.")), "image/png"));
    return new File([blob], "avatar.png", { type: "image/png" });
  } finally {
    video.src = "";
    URL.revokeObjectURL(url);
  }
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  // This existing public-media bucket accepts uploads only in the signed-in user's folder.
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/avatar-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("plugin-screenshots").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return supabase.storage.from("plugin-screenshots").getPublicUrl(path).data.publicUrl;
}