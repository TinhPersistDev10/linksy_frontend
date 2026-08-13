/**
 * SignalR HubException messages are formatted as "CODE|human message".
 * Axios/API errors may nest message under response.data.message.
 */
export function extractErrorMessage(
  err: unknown,
  fallback = "Đã xảy ra lỗi",
): string {
  if (typeof err === "string" && err.trim()) {
    return stripHubCode(err);
  }

  if (err && typeof err === "object") {
    const anyErr = err as {
      message?: string;
      response?: { data?: { message?: string } };
    };
    const apiMessage = anyErr.response?.data?.message;
    if (typeof apiMessage === "string" && apiMessage.trim()) {
      return stripHubCode(apiMessage);
    }
    if (typeof anyErr.message === "string" && anyErr.message.trim()) {
      return stripHubCode(anyErr.message);
    }
  }

  return fallback;
}

function stripHubCode(raw: string): string {
  const match = raw.match(
    /(?:CONTACT_RESTRICTED|CALL_INIT_FAILED|MESSAGE_SEND_FAILED)\|([^\n"]+)/i,
  );
  // SignalR sometimes wraps: "... Exception: CODE|message"
  if (!match) {
    const wrapped = raw.match(
      /(?:Exception|Error):\s*(?:CONTACT_RESTRICTED|CALL_INIT_FAILED|MESSAGE_SEND_FAILED)\|([^\n"]+)/i,
    );
    if (wrapped?.[1]) return wrapped[1].trim();
  }
  if (match?.[1]) return match[1].trim();

  const pipe = raw.indexOf("|");
  if (pipe > 0 && pipe < 40) {
    const after = raw.slice(pipe + 1).trim();
    if (after) return after;
  }
  return raw;
}
