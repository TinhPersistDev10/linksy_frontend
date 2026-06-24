const DEFAULT_LOCALE = "vi-VN";
function parseApiDate(value?: string | Date | null) {
  if (!value) return null;
  if (value instanceof Date) return value;

  const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(value);
  const normalized = hasTimezone ? value : `${value}Z`;

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getDisplayTimeZone(timeZone?: string) {
  return (
    timeZone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone ??
    "Asia/Ho_Chi_Minh"
  );
}

export function formatTime(
  value?: string | Date | null,
  options?: {
    timeZone?: string;
    locale?: string;
  },
) {
  if (!value) return "";

  const date = parseApiDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(options?.locale ?? DEFAULT_LOCALE, {
    timeZone: getDisplayTimeZone(options?.timeZone),
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}


export function formatLongDate(
  value?: string | Date | null,
  options?: {
    timeZone?: string;
    locale?: string;
  },
) {
  if (!value) return "";
  const date = parseApiDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(options?.locale ?? DEFAULT_LOCALE, {
    timeZone: getDisplayTimeZone(options?.timeZone),
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatDatetime(
  value?: string | Date | null,
  options?: {
    timeZone?: string;
    locale?: string;
  },
) {
  if (!value) return "";

  const date = parseApiDate(value);
  if (!date) return "";

  const locale = options?.locale ?? "vi-VN";
  const timeZone =
    options?.timeZone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone ??
    "Asia/Ho_Chi_Minh";

  return new Intl.DateTimeFormat(locale, {
    timeZone,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
export function formatDateKey(
  value?: string | Date | null,
  options?: {
    timeZone?: string;
    locale?: string;
  },
) {
  if (!value) return "";

  const date = parseApiDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat(options?.locale ?? "en-CA", {
    timeZone: getDisplayTimeZone(options?.timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

//notifications
export function formatRelativeTime(value?: string | Date | null) {
  const date = parseApiDate(value);
  if (!date) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Vừa xong";
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  return formatDatetime(date);
}
export function isToday(
  value?: string | Date | null,
  options?: {
    timeZone?: string;
    locale?: string;
  },
) {
  if (!value) return false;

  return formatDateKey(value, options) === formatDateKey(new Date(), options);
}
export function isYesterday(
  value?: string | Date | null,
  options?: {
    timeZone?: string;
    locale?: string;
  },
) {
  if (!value) return false;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return formatDateKey(value, options) === formatDateKey(yesterday, options);
}
export function formatShortDate(
  value?: string | Date | null,
  options?: {
    timeZone?: string;
    locale?: string;
  },
) {
  const date = parseApiDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat(options?.locale ?? DEFAULT_LOCALE, {
    timeZone: getDisplayTimeZone(options?.timeZone),
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}
export function formatWeekday(
  value?: string | Date | null,
  options?: {
    timeZone?: string;
    locale?: string;
  },
) {
  const date = parseApiDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat(options?.locale ?? DEFAULT_LOCALE, {
    timeZone: getDisplayTimeZone(options?.timeZone),
    weekday: "short",
  }).format(date);
}
export function formatConversationTime(
  value?: string | Date | null,
  options?: {
    timeZone?: string;
    locale?: string;
  },
) {
  if (!value) return "";

  if (isToday(value, options)) return formatTime(value, options);
  if (isYesterday(value, options)) return "Hôm qua";

  const todayKey = formatDateKey(new Date(), options);
  const valueKey = formatDateKey(value, options);

  if (!todayKey || !valueKey) return "";

  const today = new Date(`${todayKey}T00:00:00`);
  const date = new Date(`${valueKey}T00:00:00`);
  const days = Math.floor((today.getTime() - date.getTime()) / 86_400_000);

  if (days < 7) return formatWeekday(value, options);

  return formatShortDate(value, options);
}