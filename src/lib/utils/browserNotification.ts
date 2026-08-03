const GENERIC_BODY = "Bạn có thông báo mới";

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function showBrowserNotification(options: {
  title: string;
  body?: string;
  messagePreviewEnabled?: boolean;
  tag?: string;
}): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible" && document.hasFocus()) return;

  const body = options.messagePreviewEnabled === false
    ? GENERIC_BODY
    : (options.body?.trim() || GENERIC_BODY);

  try {
    const notification = new Notification(options.title || "Linksy", {
      body,
      tag: options.tag,
      silent: true, // we play our own sound when enabled
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Ignore Notification constructor failures
  }
}
