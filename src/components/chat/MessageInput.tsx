// src/components/chat/window/MessageInput.tsx
import { Clock, ImagePlus, Mic, Paperclip, Send, Smile, Sticker, Trash2, Users, X } from "lucide-react";
import type { MessageResponse, PendingMention } from "@/lib/types/message";
import type { ChatroomMemberResponse } from "@/lib/types/chatroom-member";
import type { ScheduledMessageResponse } from "@/lib/types/scheduled-message";
import { cn } from "@/lib/utils/cn";
import Button from "../ui/Button";
import { Textarea } from "../ui/textarea";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChatAvatar from "./ChatAvatar";
import {
  EVERYONE_MENTION_ID,
  filterMentionMembers,
  findActiveMentionQuery,
  getMemberDisplayName,
  insertMentionToken,
  matchesEveryoneQuery,
  syncPendingMentions,
} from "@/lib/utils/mentions";
import EmojiPickerPopover from "./EmojiPickerPopover";
import StickerPicker from "./StickerPicker";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  formatVoiceDuration,
  useVoiceRecorder,
  type VoiceFile,
} from "@/lib/hooks/useVoiceRecorder";

interface MessageInputProps {
  value: string;
  sending: boolean;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  replyTo?: MessageResponse | null;
  privateQuote?: { authorName: string; text: string } | null;
  editingMessage?: MessageResponse | null;
  onCancelMode?: () => void;
  onInsertEmoji?: (emoji: string) => void;
  onSendSticker?: (src: string) => void;

  selectedFiles?: File[];
  onFilesSelected?: (files: File[]) => void;
  onRemoveFile?: (index: number) => void;
  attachmentsDisabled?: boolean;

  enableMentions?: boolean;
  mentionMembers?: ChatroomMemberResponse[];
  currentUserId?: string;
  pendingMentions?: PendingMention[];
  onPendingMentionsChange?: (mentions: PendingMention[]) => void;

  canSendVoice?: boolean;
  onSendVoice?: (file: File) => void | Promise<void>;

  onSchedule?: (payload: {
    messageType: "text" | "sticker";
    messageText: string;
    sendAt: Date;
  }) => void | Promise<void>;
  scheduling?: boolean;
  scheduledPending?: ScheduledMessageResponse[];
  onCancelScheduled?: (id: string) => void;

  /** Messenger-style quick-send emoji shown next to the composer when it's empty. */
  quickEmoji?: string;
  onSendQuickEmoji?: (emoji: string) => void;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function replyPreviewText(message?: MessageResponse | null) {
  if (!message) return "";
  if (message.messageType === "audio" || message.messageType === "voice")
    return "Tin nhắn thoại";
  if (message.messageType === "poll")
    return message.poll?.question || message.messageText || "Bình chọn";
  if (message.messageType === "image") return "Ảnh";
  if (message.messageType === "video") return "Video";
  if (message.messageType === "file") return "Tệp đính kèm";
  if (message.messageType === "sticker") return "Sticker";
  return message.messageText || "Tin nhắn";
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toDatetimeLocalValue(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function defaultScheduleAt() {
  return new Date(Date.now() + 5 * 60 * 1000);
}

const EVERYONE_SUGGESTION: ChatroomMemberResponse = {
  userId: EVERYONE_MENTION_ID,
  username: "all",
  fullname: "Tất cả mọi người",
  avatar: null,
  memberRole: "member",
  joinedAt: "",
  isOnline: false,
  lastActiveAt: null,
  lastReadAt: null,
  nickname: null,
};

function formatScheduledAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessageInput({
  value,
  sending,
  onChange,
  onKeyDown,
  onSend,
  replyTo,
  privateQuote,
  editingMessage,
  onCancelMode,
  onInsertEmoji,
  onSendSticker,
  selectedFiles = [],
  onFilesSelected,
  onRemoveFile,
  attachmentsDisabled = false,
  enableMentions = false,
  mentionMembers = [],
  currentUserId,
  pendingMentions = [],
  onPendingMentionsChange,
  canSendVoice = true,
  onSendVoice,
  onSchedule,
  scheduling = false,
  scheduledPending = [],
  onCancelScheduled,
  quickEmoji,
  onSendQuickEmoji,
}: MessageInputProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [cursor, setCursor] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedMentionStart, setDismissedMentionStart] = useState<
    number | null
  >(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(() =>
    toDatetimeLocalValue(defaultScheduleAt()),
  );
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [confirmCancelScheduledId, setConfirmCancelScheduledId] = useState<
    string | null
  >(null);

  const canSendText = value.trim().length > 0 || selectedFiles.length > 0;
  const canScheduleText =
    Boolean(onSchedule) &&
    !editingMessage &&
    selectedFiles.length === 0 &&
    value.trim().length > 0;

  const parseScheduleAt = useCallback(() => {
    const parsed = new Date(scheduleAt);
    if (Number.isNaN(parsed.getTime())) {
      setScheduleError("Thời gian không hợp lệ.");
      return null;
    }
    if (parsed.getTime() <= Date.now() + 15_000) {
      setScheduleError("Thời gian gửi phải ở tương lai.");
      return null;
    }
    setScheduleError(null);
    return parsed;
  }, [scheduleAt]);

  const submitSchedule = useCallback(
    async (payload: { messageType: "text" | "sticker"; messageText: string }) => {
      if (!onSchedule) return;
      const sendAt = parseScheduleAt();
      if (!sendAt) return;
      await onSchedule({ ...payload, sendAt });
      setScheduleOpen(false);
      setScheduleAt(toDatetimeLocalValue(defaultScheduleAt()));
    },
    [onSchedule, parseScheduleAt],
  );

  const showMic =
    canSendVoice &&
    Boolean(onSendVoice) &&
    !canSendText &&
    !editingMessage &&
    !scheduleOpen;

  const handleAutoStop = useCallback(
    (file: VoiceFile | null) => {
      if (!file || !onSendVoice) return;
      void onSendVoice(file);
    },
    [onSendVoice],
  );

  const {
    isRecording,
    elapsedMs,
    formattedElapsed,
    maxDurationMs,
    start,
    stopAndGetFile,
    cancel,
    status,
  } = useVoiceRecorder({
    onError: (message) => setVoiceError(message),
    onAutoStop: handleAutoStop,
  });

  useEffect(() => {
    if (!voiceError) return;
    const t = setTimeout(() => setVoiceError(null), 4000);
    return () => clearTimeout(t);
  }, [voiceError]);

  const mentionQuery = useMemo(() => {
    if (!enableMentions) return null;
    return findActiveMentionQuery(value, cursor);
  }, [enableMentions, value, cursor]);

  const suggestions = useMemo(() => {
    if (!mentionQuery) return [];
    const members = filterMentionMembers(
      mentionMembers,
      mentionQuery.query,
      currentUserId,
    );
    if (mentionMembers.length > 0 && matchesEveryoneQuery(mentionQuery.query)) {
      return [EVERYONE_SUGGESTION, ...members].slice(0, 8);
    }
    return members;
  }, [mentionQuery, mentionMembers, currentUserId]);

  useEffect(() => {
    setActiveIndex(0);
  }, [mentionQuery?.start, mentionQuery?.query]);

  const applyTextChange = (
    nextValue: string,
    nextCursor: number,
    nextMentions?: PendingMention[],
  ) => {
    onChange({
      target: { value: nextValue },
    } as React.ChangeEvent<HTMLTextAreaElement>);
    setCursor(nextCursor);
    if (nextMentions && onPendingMentionsChange) {
      onPendingMentionsChange(nextMentions);
    }
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleInsertEmoji = (emoji: string) => {
    if (onInsertEmoji) {
      onInsertEmoji(emoji);
      return;
    }
    const startPos = textareaRef.current?.selectionStart ?? value.length;
    const end = textareaRef.current?.selectionEnd ?? startPos;
    const nextValue = value.slice(0, startPos) + emoji + value.slice(end);
    applyTextChange(nextValue, startPos + emoji.length);
  };

  const selectMention = (member: ChatroomMemberResponse) => {
    if (!mentionQuery) return;
    const displayName =
      member.userId === EVERYONE_MENTION_ID ? "all" : getMemberDisplayName(member);
    const inserted = insertMentionToken(
      value,
      cursor,
      mentionQuery.start,
      displayName,
    );
    const nextPending = syncPendingMentions(inserted.text, [
      ...pendingMentions.filter((m) => m.userId !== member.userId),
      { userId: member.userId, displayName },
    ]);
    applyTextChange(inserted.text, inserted.cursor, nextPending);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = e.target.value;
    const nextCursor = e.target.selectionStart ?? nextValue.length;
    setCursor(nextCursor);
    onChange(e);
    if (enableMentions && onPendingMentionsChange) {
      onPendingMentionsChange(syncPendingMentions(nextValue, pendingMentions));
    }
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCursor(e.currentTarget.selectionStart ?? 0);
  };

  const handleKeyDownInternal = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (isRecording) {
      e.preventDefault();
      return;
    }

    const dropdownOpen =
      suggestions.length > 0 &&
      mentionQuery != null &&
      dismissedMentionStart !== mentionQuery.start;

    if (dropdownOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex(
          (prev) => (prev - 1 + suggestions.length) % suggestions.length,
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectMention(suggestions[activeIndex]!);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setActiveIndex(0);
        setDismissedMentionStart(mentionQuery?.start ?? null);
        return;
      }
    }

    if (e.key === "Backspace" && enableMentions && pendingMentions.length > 0) {
      const pos = e.currentTarget.selectionStart ?? 0;
      const selEnd = e.currentTarget.selectionEnd ?? pos;
      if (pos === selEnd) {
        const mentionBefore = pendingMentions
          .map((m) => ({
            mention: m,
            token: `@${m.displayName}`,
            start: value.lastIndexOf(`@${m.displayName}`, Math.max(0, pos - 1)),
          }))
          .filter((item) => item.start >= 0)
          .find(
            (item) =>
              pos === item.start + item.token.length ||
              (pos > item.start && pos <= item.start + item.token.length),
          );

        if (mentionBefore) {
          e.preventDefault();
          const { start: tokenStart, token, mention } = mentionBefore;
          const end = tokenStart + token.length;
          const eatSpace =
            value[end] === " " && pos >= end ? end + 1 : Math.max(pos, end);
          const nextText = value.slice(0, tokenStart) + value.slice(eatSpace);
          const nextMentions = pendingMentions.filter(
            (m) => m.userId !== mention.userId,
          );
          applyTextChange(nextText, tokenStart, nextMentions);
          return;
        }
      }
    }

    if (e.key === "Enter" && !e.shiftKey && scheduleOpen) {
      e.preventDefault();
      if (canScheduleText) {
        void submitSchedule({
          messageType: "text",
          messageText: value.trim(),
        });
      }
      return;
    }

    onKeyDown(e);
  };

  useEffect(() => {
    if (!mentionQuery) {
      setDismissedMentionStart(null);
      return;
    }
    if (dismissedMentionStart !== mentionQuery.start) {
      setDismissedMentionStart(null);
    }
  }, [mentionQuery, dismissedMentionStart]);

  const showSuggestions =
    suggestions.length > 0 &&
    mentionQuery != null &&
    dismissedMentionStart !== mentionQuery.start;

  const handleStartVoice = async () => {
    setVoiceError(null);
    if (status === "unsupported") {
      setVoiceError("Trình duyệt không hỗ trợ ghi âm.");
      return;
    }
    await start();
  };

  const handleCancelVoice = () => {
    cancel();
  };

  const handleSendVoice = async () => {
    if (!onSendVoice) return;
    const file = await stopAndGetFile();
    if (!file) {
      setVoiceError("Tin nhắn thoại quá ngắn. Giữ lâu hơn một chút.");
      return;
    }
    await onSendVoice(file);
  };

  const recordProgress = Math.min(1, elapsedMs / maxDurationMs);

  return (
    <div className="shrink-0 border-t bg-background px-2 py-2 sm:px-4 sm:py-3">
      {(replyTo || privateQuote || editingMessage) && !isRecording && (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-md border bg-muted/50 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-medium">
              {editingMessage
                ? "Chỉnh sửa tin nhắn"
                : privateQuote
                  ? `Trả lời riêng ${privateQuote.authorName}`
                  : `Trả lời ${replyTo?.senderFullname ?? "tin nhắn"}`}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {privateQuote
                ? privateQuote.text
                : replyPreviewText(editingMessage ?? replyTo)}
            </p>
          </div>

          <button
            type="button"
            onClick={onCancelMode}
            title="Hủy"
            aria-label="Hủy thao tác"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {selectedFiles.length > 0 && !isRecording && (
        <div className="mb-2 flex max-h-24 flex-wrap gap-2 overflow-y-auto">
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className="flex max-w-full items-center gap-2 rounded-md border bg-muted/50 px-2 py-1 text-xs sm:max-w-64"
            >
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="shrink-0 text-muted-foreground">
                {formatFileSize(file.size)}
              </span>
              <button
                type="button"
                onClick={() => onRemoveFile?.(index)}
                title="Xóa tệp"
                aria-label="Xóa tệp"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {voiceError && (
        <p className="mb-2 text-center text-xs text-destructive">{voiceError}</p>
      )}

      <div className="relative">
        {showSuggestions && !isRecording && (
          <div className="absolute bottom-full left-0 right-0 z-20 mb-1 max-h-56 overflow-y-auto rounded-lg border bg-background py-1 shadow-lg">
            {suggestions.map((member, index) => {
              const isEveryone = member.userId === EVERYONE_MENTION_ID;
              const displayName = isEveryone
                ? "Tất cả mọi người"
                : getMemberDisplayName(member);
              return (
                <button
                  key={member.userId}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectMention(member);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted",
                    index === activeIndex && "bg-muted",
                  )}
                >
                  {isEveryone ? (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-300">
                      <Users size={14} />
                    </span>
                  ) : (
                    <ChatAvatar
                      src={member.avatar ?? undefined}
                      name={displayName}
                      size={7}
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {displayName}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {isEveryone ? "@all" : `@${member.username}`}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {isRecording ? (
          <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-2 py-2 dark:border-red-900/50 dark:bg-red-950/40 sm:gap-3 sm:px-3">
            <button
              type="button"
              onClick={handleCancelVoice}
              disabled={sending}
              title="Hủy ghi âm"
              aria-label="Hủy ghi âm"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/40"
            >
              <Trash2 size={18} />
            </button>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
                <span className="text-sm font-medium tabular-nums text-red-700 dark:text-red-300">
                  {formattedElapsed}
                </span>
                <span className="text-xs text-muted-foreground">
                  / {formatVoiceDuration(maxDurationMs)}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-red-200 dark:bg-red-900/60">
                <div
                  className="h-full rounded-full bg-red-500 transition-[width] duration-200"
                  style={{ width: `${recordProgress * 100}%` }}
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={() => void handleSendVoice()}
              disabled={sending || elapsedMs < 400}
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full bg-sky-500 text-white hover:bg-sky-600"
              title="Gửi tin nhắn thoại"
              aria-label="Gửi tin nhắn thoại"
            >
              <Send size={16} />
            </Button>
          </div>
        ) : (
          <div>
            {scheduleOpen && onSchedule && !editingMessage && (
              <div className="mb-2 rounded-xl border bg-background p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Hẹn giờ gửi</p>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleOpen(false);
                      setScheduleError(null);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Đóng
                  </button>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    min={toDatetimeLocalValue(new Date(Date.now() + 60_000))}
                    onChange={(e) => {
                      setScheduleAt(e.target.value);
                      setScheduleError(null);
                    }}
                    className="h-9 w-full rounded-md border bg-background px-2 text-sm sm:max-w-[220px]"
                  />
                  <Button
                    type="button"
                    disabled={scheduling || !canScheduleText}
                    onClick={() =>
                      void submitSchedule({
                        messageType: "text",
                        messageText: value.trim(),
                      })
                    }
                    className="h-9 shrink-0"
                  >
                    {scheduling ? "Đang hẹn..." : "Hẹn giờ"}
                  </Button>
                </div>
                {scheduleError && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                    {scheduleError}
                  </p>
                )}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Chỉ tin nhắn chữ hoặc sticker. Chọn sticker khi panel này đang
                  mở để hẹn giờ sticker.
                </p>
                {scheduledPending.length > 0 && (
                  <ul className="mt-3 max-h-36 space-y-1.5 overflow-y-auto border-t pt-2">
                    {scheduledPending.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {item.messageType === "sticker"
                              ? "Sticker"
                              : item.messageText}
                          </p>
                          <p className="text-muted-foreground">
                            {formatScheduledAt(item.sendAt)}
                          </p>
                        </div>
                        {onCancelScheduled && (
                          <button
                            type="button"
                            className="shrink-0 text-red-600 hover:underline"
                            onClick={() => setConfirmCancelScheduledId(item.id)}
                          >
                            Hủy
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          <div className="flex items-end gap-1.5 sm:items-center sm:gap-2">
          <div className="flex min-w-0 flex-1 items-end gap-1.5 rounded-2xl border bg-muted/50 px-2 py-2 sm:items-center sm:gap-2 sm:px-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.json,.csv,.xml,.yaml,.yml,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip"
              disabled={attachmentsDisabled || scheduleOpen}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                onFilesSelected?.(files);
                e.currentTarget.value = "";
              }}
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              hidden
              disabled={attachmentsDisabled || scheduleOpen}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []).filter((file) =>
                  file.type.startsWith("image/"),
                );
                if (files.length > 0) onFilesSelected?.(files);
                e.currentTarget.value = "";
              }}
            />
            <Button
              type="button"
              onClick={() => {
                if (!attachmentsDisabled) imageInputRef.current?.click();
              }}
              disabled={attachmentsDisabled || scheduleOpen}
              variant="ghost"
              size="icon"
              title="Gửi ảnh"
              aria-label="Gửi ảnh"
              className="mb-0.5 h-8 w-8 shrink-0 p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <ImagePlus size={18} />
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!attachmentsDisabled) fileInputRef.current?.click();
              }}
              disabled={attachmentsDisabled || scheduleOpen}
              variant="ghost"
              size="icon"
              title="Đính kèm tệp"
              aria-label="Đính kèm tệp"
              className="mb-0.5 h-8 w-8 shrink-0 p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Paperclip size={18} />
            </Button>

            <Textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDownInternal}
              onClick={handleSelect}
              onSelect={handleSelect}
              onKeyUp={handleSelect}
              placeholder={
                editingMessage
                  ? "Chỉnh sửa tin nhắn..."
                  : enableMentions
                    ? "Nhắn tin... dùng @ để tag"
                    : "Nhắn tin..."
              }
              rows={1}
              className={cn(
                "min-h-0 min-w-0 flex-1 resize-none border-0 bg-transparent py-0.5 text-sm shadow-none",
                "focus-visible:ring-0 focus-visible:ring-offset-0",
                "max-h-32 placeholder:text-muted-foreground",
                "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              )}
            />

            <EmojiPickerPopover
              side="top"
              align="end"
              onSelect={handleInsertEmoji}
            >
              <Button
                type="button"
                title="Emoji"
                aria-label="Chọn emoji"
                variant="ghost"
                size="icon"
                className="mb-0.5 inline-flex h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <Smile size={18} />
              </Button>
            </EmojiPickerPopover>

            {onSchedule && !editingMessage && (
              <Button
                type="button"
                title="Hẹn giờ gửi"
                aria-label="Hẹn giờ gửi"
                variant="ghost"
                size="icon"
                disabled={sending || scheduling}
                onClick={() => {
                  setScheduleOpen((open) => !open);
                  setScheduleError(null);
                  if (!scheduleAt) {
                    setScheduleAt(toDatetimeLocalValue(defaultScheduleAt()));
                  }
                }}
                className={cn(
                  "mb-0.5 inline-flex h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground",
                  scheduleOpen && "text-sky-600",
                )}
              >
                <Clock size={18} />
              </Button>
            )}

            {onSendSticker && !editingMessage && (
              <StickerPicker
                disabled={sending || scheduling}
                onSelect={(src) => {
                  if (scheduleOpen && onSchedule) {
                    void submitSchedule({
                      messageType: "sticker",
                      messageText: src,
                    });
                    return;
                  }
                  onSendSticker(src);
                }}
              >
                <Button
                  type="button"
                  title="Sticker"
                  aria-label="Chọn sticker"
                  variant="ghost"
                  size="icon"
                  className="mb-0.5 inline-flex h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <Sticker size={18} />
                </Button>
              </StickerPicker>
            )}

            {showMic ? (
              <Button
                type="button"
                onClick={() => void handleStartVoice()}
                disabled={sending}
                size="icon"
                title="Ghi âm tin nhắn thoại"
                aria-label="Ghi âm tin nhắn thoại"
                className="mb-0.5 h-8 w-8 shrink-0 rounded-full bg-sky-500 text-white hover:bg-sky-600"
              >
                <Mic size={16} />
              </Button>
            ) : (
              <Button
                onClick={() => {
                  if (scheduleOpen) {
                    if (canScheduleText) {
                      void submitSchedule({
                        messageType: "text",
                        messageText: value.trim(),
                      });
                    }
                    return;
                  }
                  onSend();
                }}
                disabled={
                  sending ||
                  scheduling ||
                  (scheduleOpen ? !canScheduleText : !canSendText)
                }
                size="icon"
                title={scheduleOpen ? "Hẹn giờ gửi" : "Gửi"}
                aria-label={scheduleOpen ? "Hẹn giờ gửi" : "Gửi"}
                className={cn(
                  "mb-0.5 h-7 w-7 shrink-0 rounded-xl transition-all",
                  (scheduleOpen ? canScheduleText : canSendText)
                    ? "bg-sky-500 text-white hover:bg-sky-600"
                    : "bg-transparent text-muted-foreground hover:bg-transparent",
                )}
              >
                {scheduleOpen ? <Clock size={16} /> : <Send size={16} />}
              </Button>
            )}
          </div>

          {!scheduleOpen &&
            !editingMessage &&
            !canSendText &&
            quickEmoji &&
            onSendQuickEmoji && (
              <Button
                type="button"
                onClick={() => onSendQuickEmoji(quickEmoji)}
                disabled={sending}
                size="icon"
                title={`Gửi nhanh ${quickEmoji}`}
                aria-label={`Gửi nhanh ${quickEmoji}`}
                className="mb-0.5 h-9 w-9 shrink-0 rounded-full bg-muted text-xl leading-none transition-transform hover:scale-110 hover:bg-accent"
              >
                <span>{quickEmoji}</span>
              </Button>
            )}
          </div>
        </div>
        )}
      </div>

      <p className="mt-1.5 hidden text-center text-[10px] text-muted-foreground sm:block">
        {isRecording
          ? "Đang ghi âm · Bấm gửi để gửi tin nhắn thoại · Thùng rác để hủy"
          : `Enter để gửi · Shift+Enter xuống dòng${
              enableMentions ? " · @ để tag thành viên" : ""
            }${showMic ? " · Micro để ghi âm" : ""}${
              onSchedule ? " · Đồng hồ để hẹn giờ" : ""
            }`}
      </p>

      <ConfirmDialog
        open={confirmCancelScheduledId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmCancelScheduledId(null);
        }}
        title="Hủy tin nhắn hẹn giờ"
        description="Bạn có chắc chắn muốn hủy tin nhắn hẹn giờ này?"
        confirmLabel="Hủy tin nhắn"
        cancelLabel="Đóng"
        variant="destructive"
        onConfirm={() => {
          if (confirmCancelScheduledId) {
            onCancelScheduled?.(confirmCancelScheduledId);
          }
          setConfirmCancelScheduledId(null);
        }}
      />
    </div>
  );
}
