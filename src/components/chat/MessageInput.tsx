// src/components/chat/window/MessageInput.tsx
import { ImagePlus, Mic, Paperclip, Send, Smile, Sticker, Trash2, X } from "lucide-react";
import type { MessageResponse, PendingMention } from "@/lib/types/message";
import type { ChatroomMemberResponse } from "@/lib/types/chatroom-member";
import { cn } from "@/lib/utils/cn";
import Button from "../ui/Button";
import { Textarea } from "../ui/textarea";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChatAvatar from "./ChatAvatar";
import {
  filterMentionMembers,
  findActiveMentionQuery,
  getMemberDisplayName,
  insertMentionToken,
  syncPendingMentions,
} from "@/lib/utils/mentions";
import EmojiPickerPopover from "./EmojiPickerPopover";
import StickerPicker from "./StickerPicker";
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

  const canSendText = value.trim().length > 0 || selectedFiles.length > 0;
  const showMic =
    canSendVoice &&
    Boolean(onSendVoice) &&
    !canSendText &&
    !editingMessage;

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
    return filterMentionMembers(
      mentionMembers,
      mentionQuery.query,
      currentUserId,
    );
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
    const displayName = getMemberDisplayName(member);
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
              const displayName = getMemberDisplayName(member);
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
                  <ChatAvatar
                    src={member.avatar ?? undefined}
                    name={displayName}
                    size={7}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {displayName}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    @{member.username}
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
              className="h-9 w-9 shrink-0 rounded-full bg-blue-500 text-white hover:bg-blue-600"
              title="Gửi tin nhắn thoại"
              aria-label="Gửi tin nhắn thoại"
            >
              <Send size={16} />
            </Button>
          </div>
        ) : (
          <div className="flex items-end gap-1.5 rounded-2xl border bg-muted/50 px-2 py-2 sm:items-center sm:gap-2 sm:px-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.json,.csv,.xml,.yaml,.yml,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip"
              disabled={attachmentsDisabled}
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
              disabled={attachmentsDisabled}
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
              disabled={attachmentsDisabled}
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
              disabled={attachmentsDisabled}
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

            {onSendSticker && !editingMessage && (
              <StickerPicker
                disabled={sending}
                onSelect={(src) => onSendSticker(src)}
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
                className="mb-0.5 h-8 w-8 shrink-0 rounded-full bg-blue-500 text-white hover:bg-blue-600"
              >
                <Mic size={16} />
              </Button>
            ) : (
              <Button
                onClick={onSend}
                disabled={!canSendText || sending}
                size="icon"
                className={cn(
                  "mb-0.5 h-7 w-7 shrink-0 rounded-xl transition-all",
                  canSendText
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "bg-transparent text-muted-foreground hover:bg-transparent",
                )}
              >
                <Send size={16} />
              </Button>
            )}
          </div>
        )}
      </div>

      <p className="mt-1.5 hidden text-center text-[10px] text-muted-foreground sm:block">
        {isRecording
          ? "Đang ghi âm · Bấm gửi để gửi tin nhắn thoại · Thùng rác để hủy"
          : `Enter để gửi · Shift+Enter xuống dòng${
              enableMentions ? " · @ để tag thành viên" : ""
            }${showMic ? " · Micro để ghi âm" : ""}`}
      </p>
    </div>
  );
}
