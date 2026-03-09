// src/components/chat/utils/chatFormatters.ts

export function formatMessageTime(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export function formatDateDivider(dateStr: string): string {
  const date = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return "Hôm nay";
  if (diffDays === 1) return "Hôm qua";
  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function buildAvatarUrl(src: string | undefined, baseUrl: string): string | undefined {
  if (!src?.trim()) return undefined;
  return src.startsWith("http") ? src : `${baseUrl}${src}`;
}