import type { MentionDto, PendingMention } from "@/lib/types/message";
import type { ChatroomMemberResponse } from "@/lib/types/chatroom-member";

/** Sentinel userId for the "@all"/"@everyone" suggestion — never sent as a real Guid to the API. */
export const EVERYONE_MENTION_ID = "everyone";

const EVERYONE_TOKEN_REGEX = /(?<![\w@])@(all|everyone)(?!\w)/gi;

export function matchesEveryoneQuery(query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return "all".startsWith(q) || "everyone".startsWith(q);
}

export function getMemberDisplayName(
  member: Pick<ChatroomMemberResponse, "nickname" | "fullname" | "username">,
): string {
  return member.nickname?.trim() || member.fullname?.trim() || member.username;
}

export function findActiveMentionQuery(
  text: string,
  cursor: number,
): { start: number; query: string } | null {
  const before = text.slice(0, cursor);
  const match = before.match(/(^|[\s])@([^\s@]*)$/);
  if (!match) return null;

  const atIndex = before.lastIndexOf("@");
  return {
    start: atIndex,
    query: match[2] ?? "",
  };
}

export function filterMentionMembers(
  members: ChatroomMemberResponse[],
  query: string,
  currentUserId?: string,
): ChatroomMemberResponse[] {
  const normalized = query.trim().toLowerCase();
  return members
    .filter((member) => member.userId !== currentUserId)
    .filter((member) => {
      if (!normalized) return true;
      const display = getMemberDisplayName(member).toLowerCase();
      return (
        display.includes(normalized) ||
        member.username.toLowerCase().includes(normalized) ||
        member.fullname.toLowerCase().includes(normalized)
      );
    })
    .slice(0, 8);
}

export function insertMentionToken(
  text: string,
  cursor: number,
  mentionStart: number,
  displayName: string,
): { text: string; cursor: number; token: string } {
  const token = `@${displayName}`;
  const after = text.slice(cursor);
  const needsSpace = after.length === 0 || !/^\s/.test(after);
  const insertion = needsSpace ? `${token} ` : token;
  const nextText = text.slice(0, mentionStart) + insertion + after;
  const nextCursor = mentionStart + insertion.length;
  return { text: nextText, cursor: nextCursor, token };
}

export function syncPendingMentions(
  text: string,
  pending: PendingMention[],
): PendingMention[] {
  return pending.filter((mention) =>
    text.includes(`@${mention.displayName}`),
  );
}

export type MessageTextSegment =
  | { type: "text"; value: string }
  | { type: "mention"; value: string; userId: string; isSelf: boolean };

export function splitMessageTextWithMentions(
  text: string,
  mentions: MentionDto[] | null | undefined,
  currentUserId?: string,
): MessageTextSegment[] {
  if (!text) return [];
  if (!mentions || mentions.length === 0) {
    return [{ type: "text", value: text }];
  }

  const uniqueMentions = [...mentions]
    .filter((m) => m.displayName?.trim())
    .sort((a, b) => b.displayName.length - a.displayName.length);

  type Hit = { start: number; end: number; mention: MentionDto | null };
  const hits: Hit[] = [];

  for (const mention of uniqueMentions) {
    const token = `@${mention.displayName}`;
    let from = 0;
    while (from < text.length) {
      const index = text.indexOf(token, from);
      if (index === -1) break;

      const overlaps = hits.some(
        (hit) => index < hit.end && index + token.length > hit.start,
      );
      if (!overlaps) {
        hits.push({
          start: index,
          end: index + token.length,
          mention,
        });
      }
      from = index + token.length;
    }
  }

  // The server expands "@all"/"@everyone" into a real mention for every member
  // instead of a display name, so highlight the literal token separately.
  EVERYONE_TOKEN_REGEX.lastIndex = 0;
  let everyoneMatch: RegExpExecArray | null;
  while ((everyoneMatch = EVERYONE_TOKEN_REGEX.exec(text))) {
    const start = everyoneMatch.index;
    const end = start + everyoneMatch[0].length;
    const overlaps = hits.some((hit) => start < hit.end && end > hit.start);
    if (!overlaps) {
      hits.push({ start, end, mention: null });
    }
  }

  hits.sort((a, b) => a.start - b.start);

  const segments: MessageTextSegment[] = [];
  let cursor = 0;
  for (const hit of hits) {
    if (hit.start > cursor) {
      segments.push({ type: "text", value: text.slice(cursor, hit.start) });
    }
    segments.push({
      type: "mention",
      value: text.slice(hit.start, hit.end),
      userId: hit.mention?.userId ?? EVERYONE_MENTION_ID,
      isSelf: hit.mention
        ? Boolean(currentUserId && hit.mention.userId === currentUserId)
        : Boolean(currentUserId),
    });
    cursor = hit.end;
  }

  if (cursor < text.length) {
    segments.push({ type: "text", value: text.slice(cursor) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
}
