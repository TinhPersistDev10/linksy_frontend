export const COMMUNITY_VIOLATION_MESSAGE =
  "Tin nhắn của bạn có từ khóa vi phạm tiêu chuẩn cộng đồng.";

const BANNED_WORDS = [
  "dit",
  "deo",
  "cac",
  "buoi",
  "dmm",
  "vcl",
  "clgt",
  "oc cho",
  "occho",
  "fuck",
  "fucker",
  "motherfucker",
  "shit",
  "bitch",
  "asshole",
  "dick",
  "pussy",
  "cunt",
  "ditmemay",
  "ditme",
  "giet",
  "kill",
  "chem"
];

function normalize(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
}

const bannedTokens = new Set(
  BANNED_WORDS.map(normalize).filter((w) => w.length > 0 && !w.includes(" ")),
);

const bannedPhrases = BANNED_WORDS.map(normalize).filter((w) =>
  w.includes(" "),
);

export function containsBannedContent(text: string | null | undefined): boolean {
  if (!text || !text.trim()) return false;

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

export function ensureMessageAllowed(text: string | null | undefined): void {
  if (containsBannedContent(text)) {
    throw new Error(COMMUNITY_VIOLATION_MESSAGE);
  }
}
