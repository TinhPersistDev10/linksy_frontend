/**
 * Structured payload persisted server-side (Message.messageText) for messages
 * of type "call_log". Mirrors backend CallLogMessagePayload so the frontend
 * can render call cards deterministically instead of parsing sentences.
 */
export interface CallLogMessagePayload {
  callLogId: string;
  callType: "audio" | "video";
  status: "ended" | "missed" | "rejected";
  durationSec: number;
  startedAt?: string | null;
  endedAt?: string | null;
  isGroup?: boolean;
  callerId?: string;
  callerName?: string | null;
  chatroomName?: string | null;
}

/** Dòng xem trước 1 dòng cho sidebar hội thoại, ví dụ "🎥 Cuộc gọi video đi". */
export function formatCallLogPreview(
  payload: CallLogMessagePayload,
  isOwn: boolean,
): string {
  const icon = payload.callType === "video" ? "🎥" : "📞";
  const typeLabel =
    payload.callType === "video" ? "Cuộc gọi video" : "Cuộc gọi thoại";

  if (payload.isGroup) {
    const callerName = payload.callerName?.trim() || "Ai đó";
    const roomName = payload.chatroomName?.trim() || "nhóm";
    if (payload.status === "missed")
      return `${icon} Cuộc gọi nhóm nhỡ từ ${callerName}`;
    if (payload.status === "rejected")
      return `${icon} Cuộc gọi nhóm bị từ chối`;
    return `${icon} ${callerName} đã bắt đầu cuộc gọi nhóm ${roomName}`;
  }

  if (payload.status === "missed" && !isOwn) return `${icon} ${typeLabel} nhỡ`;
  if (payload.status === "missed" && isOwn)
    return `${icon} ${typeLabel} không trả lời`;
  if (payload.status === "rejected")
    return `${icon} ${typeLabel} bị từ chối`;

  return `${icon} ${typeLabel} ${isOwn ? "đi" : "đến"}`;
}

export function parseCallLogPayload(
  messageText: string,
): CallLogMessagePayload | null {
  try {
    const parsed = JSON.parse(messageText) as Partial<CallLogMessagePayload>;
    if (
      !parsed ||
      (parsed.callType !== "audio" && parsed.callType !== "video") ||
      typeof parsed.callLogId !== "string"
    ) {
      return null;
    }

    const status: CallLogMessagePayload["status"] =
      parsed.status === "missed" || parsed.status === "rejected"
        ? parsed.status
        : "ended";

    return {
      callLogId: parsed.callLogId,
      callType: parsed.callType,
      status,
      durationSec:
        typeof parsed.durationSec === "number" && parsed.durationSec > 0
          ? parsed.durationSec
          : 0,
      startedAt:
        typeof parsed.startedAt === "string" || parsed.startedAt === null
          ? parsed.startedAt
          : undefined,
      endedAt:
        typeof parsed.endedAt === "string" || parsed.endedAt === null
          ? parsed.endedAt
          : undefined,
      isGroup: typeof parsed.isGroup === "boolean" ? parsed.isGroup : false,
      callerId: typeof parsed.callerId === "string" ? parsed.callerId : undefined,
      callerName:
        typeof parsed.callerName === "string" || parsed.callerName === null
          ? parsed.callerName
          : undefined,
      chatroomName:
        typeof parsed.chatroomName === "string" || parsed.chatroomName === null
          ? parsed.chatroomName
          : undefined,
    };
  } catch {
    return null;
  }
}
