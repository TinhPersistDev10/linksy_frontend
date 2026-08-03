export default function getAttachmentType(
  file: File,
): "image" | "video" | "audio" | "file" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  // Voice notes from MediaRecorder often use webm/ogg/mp4 containers
  if (
    file.name.startsWith("voice-") &&
    (file.type.includes("webm") ||
      file.type.includes("ogg") ||
      file.type.includes("mp4") ||
      file.type.includes("m4a"))
  )
    return "audio";
  if (file.type.startsWith("video/")) return "video";
  if (/\.(mp3|m4a|aac|wav|ogg)$/i.test(file.name)) return "audio";
  return "file";
}