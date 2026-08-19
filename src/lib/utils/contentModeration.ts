import type { ContentModerationConfig } from "@/lib/types/contentModeration";

export const COMMUNITY_VIOLATION_MESSAGE =
  "Tin nhắn của bạn có từ khóa vi phạm tiêu chuẩn cộng đồng.";

const ZERO_WIDTH_PATTERN = new RegExp(
  `[${String.fromCharCode(0x200b, 0x200c, 0x200d, 0xfeff)}]`,
  "g",
);

function normalize(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(ZERO_WIDTH_PATTERN, "");
}

export function containsBannedContent(
  text: string | null | undefined,
  config: ContentModerationConfig | null | undefined,
): boolean {
  if (!config?.enabled) return false;
  if (!text || !text.trim()) return false;

  const bannedTokens = new Set(
    config.bannedWords
      .map(normalize)
      .filter((w) => w.length > 0 && !w.includes(" ")),
  );
  const bannedPhrases = config.bannedWords
    .map(normalize)
    .filter((w) => w.includes(" "));

  const normalized = normalize(text);
  if (!normalized) return false;

  for (const phrase of bannedPhrases) {
    const parts = phrase.split(/\s+/).filter(Boolean);
    const pattern = parts
      .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("[^\\p{L}\\p{N}]+");
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${pattern}([^\\p{L}\\p{N}]|$)`, "u");
    if (re.test(normalized)) return true;
  }

  const tokens = normalized.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return tokens.some((token) => bannedTokens.has(token));
}

export function ensureMessageAllowed(
  text: string | null | undefined,
  config: ContentModerationConfig | null | undefined,
): void {
  if (containsBannedContent(text, config)) {
    throw new Error(COMMUNITY_VIOLATION_MESSAGE);
  }
}
