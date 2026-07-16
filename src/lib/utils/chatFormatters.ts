import {
  formatDateKey,
  formatLongDate,
  formatTime,
  formatDatetime,
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

/** "125" -> "2 phút 5 giây" — dùng cho thẻ hiển thị lịch sử cuộc gọi. */
export function formatCallDuration(sec: number): string {
  if (sec < 0) return "";
  if (sec === 0) return "0 giây";
  if (sec < 60) return `${sec} giây`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m} phút ${s} giây` : `${m} phút`;
}

export function formatCallOccurredAt(dateStr: string): string {
  return formatDatetime(dateStr);
}