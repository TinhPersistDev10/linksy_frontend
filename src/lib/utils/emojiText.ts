/** True when the string is only emoji / ZWJ / variation selectors / whitespace. */
export function isEmojiOnlyText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return /^(?:[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D\s])+$/u.test(
    trimmed,
  );
}

export function countEmojis(text: string): number {
  return text.match(/\p{Extended_Pictographic}/gu)?.length ?? 0;
}

/** Tailwind text size for emoji-only messages (Messenger-style). */
export function emojiOnlyTextClass(text: string): string | null {
  if (!isEmojiOnlyText(text)) return null;
  const count = countEmojis(text);
  if (count <= 0) return null;
  if (count === 1) return "text-5xl leading-none";
  if (count === 2) return "text-4xl leading-none";
  if (count <= 3) return "text-3xl leading-snug";
  return "text-2xl leading-snug";
}
