import {
  formatDateKey,
  formatLongDate,
  formatTime,
  isToday,
  isYesterday,
} from "./datetime";

export function formatMessageTime(dateStr: string): string {
  return formatTime(dateStr);
}

export function isSameDay(a: string, b: string): boolean {
  return formatDateKey(a) === formatDateKey(b);
}

export function formatDateDivider(dateStr: string): string {
  if (isToday(dateStr)) return "Hôm nay";
  if (isYesterday(dateStr)) return "Hôm qua";

  return formatLongDate(dateStr);
}

export function buildAvatarUrl(
  src: string | undefined,
  baseUrl: string,
): string | undefined {
  if (!src?.trim()) return undefined;
  return src.startsWith("http") ? src : `${baseUrl}${src}`;
}