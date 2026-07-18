export type LinkTextSegment =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string };

/** Match http(s) URLs and www.* (no scheme). */
const URL_PATTERN =
  /\b((?:https?:\/\/|www\.)[^\s<>"'`]+[^\s<>"'`.,;:!?)\]}])/gi;

function trimTrailingPunctuation(raw: string): {
  url: string;
  trailing: string;
} {
  let url = raw;
  let trailing = "";
  while (url.length > 0 && /[.,;:!?)]$/.test(url)) {
    trailing = url.slice(-1) + trailing;
    url = url.slice(0, -1);
  }
  return { url, trailing };
}

export function normalizeHref(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

export function splitTextWithLinks(text: string): LinkTextSegment[] {
  if (!text) return [];

  const segments: LinkTextSegment[] = [];
  let lastIndex = 0;
  const regex = new RegExp(URL_PATTERN.source, URL_PATTERN.flags);

  for (const match of text.matchAll(regex)) {
    const raw = match[0] ?? "";
    const start = match.index ?? 0;
    if (start < lastIndex) continue;

    if (start > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, start) });
    }

    const { url, trailing } = trimTrailingPunctuation(raw);
    const href = normalizeHref(url);
    if (href) {
      segments.push({ type: "link", value: url, href });
      if (trailing) {
        segments.push({ type: "text", value: trailing });
      }
    } else {
      segments.push({ type: "text", value: raw });
    }

    lastIndex = start + raw.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
}
