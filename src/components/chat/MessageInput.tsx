// src/components/chat/window/MessageInput.tsx
import { Paperclip, Send, Smile, X } from "lucide-react";
import type { MessageResponse, PendingMention } from "@/lib/types/message";
import type { ChatroomMemberResponse } from "@/lib/types/chatroom-member";
import { cn } from "@/lib/utils/cn";
import Button from "../ui/Button";
import { Textarea } from "../ui/textarea";
import { useEffect, useMemo, useRef, useState } from "react";
import ChatAvatar from "./ChatAvatar";
import {
  filterMentionMembers,
  findActiveMentionQuery,
  getMemberDisplayName,
  insertMentionToken,
  syncPendingMentions,
} from "@/lib/utils/mentions";
import EmojiPickerPopover from "./EmojiPickerPopover";

interface MessageInputProps {
  value: string;
  sending: boolean;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  replyTo?: MessageResponse | null;
  editingMessage?: MessageResponse | null;
  onCancelMode?: () => void;
  onInsertEmoji?: (emoji: string) => void;

  selectedFiles?: File[];
  onFilesSelected?: (files: File[]) => void;
  onRemoveFile?: (index: number) => void;
  attachmentsDisabled?: boolean;

  enableMentions?: boolean;
  mentionMembers?: ChatroomMemberResponse[];
  currentUserId?: string;
  pendingMentions?: PendingMention[];
  onPendingMentionsChange?: (mentions: PendingMention[]) => void;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function MessageInput({
  value,
  sending,
  onChange,
  onKeyDown,
  onSend,
  replyTo,
  editingMessage,
  onCancelMode,
  onInsertEmoji,
  selectedFiles = [],
  onFilesSelected,
  onRemoveFile,
  attachmentsDisabled = false,
  enableMentions = false,
  mentionMembers = [],
  currentUserId,
  pendingMentions = [],
  onPendingMentionsChange,
}: MessageInputProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [cursor, setCursor] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedMentionStart, setDismissedMentionStart] = useState<
    number | null
  >(null);

  const canSend = value.trim().length > 0 || selectedFiles.length > 0;

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
    const start = textareaRef.current?.selectionStart ?? value.length;
    const end = textareaRef.current?.selectionEnd ?? start;
    const nextValue = value.slice(0, start) + emoji + value.slice(end);
    applyTextChange(nextValue, start + emoji.length);
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
          const { start, token, mention } = mentionBefore;
          const end = start + token.length;
          const eatSpace =
            value[end] === " " && pos >= end ? end + 1 : Math.max(pos, end);
          const nextText = value.slice(0, start) + value.slice(eatSpace);
          const nextMentions = pendingMentions.filter(
            (m) => m.userId !== mention.userId,
          );
          applyTextChange(nextText, start, nextMentions);
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

  return (
    <div className="shrink-0 border-t bg-background px-2 py-2 sm:px-4 sm:py-3">
      {(replyTo || editingMessage) && (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-md border bg-muted/50 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-medium">
              {editingMessage
                ? "Chỉnh sửa tin nhắn"
                : `Trả lời ${replyTo?.senderFullname ?? "tin nhắn"}`}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {editingMessage?.messageText ?? replyTo?.messageText}
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

      {selectedFiles.length > 0 && (
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
                title="Xoa tep"
                aria-label="Xoa tep"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        {showSuggestions && (
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

        <div className="flex items-end gap-1.5 rounded-2xl border bg-muted/50 px-2 py-2 sm:items-center sm:gap-2 sm:px-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            disabled={attachmentsDisabled}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              onFilesSelected?.(files);
              e.currentTarget.value = "";
            }}
          />
          <Button
            type="button"
            onClick={() => {
              if (!attachmentsDisabled) fileInputRef.current?.click();
            }}
            disabled={attachmentsDisabled}
            variant="ghost"
            size="icon"
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

          <EmojiPickerPopover side="top" align="end" onSelect={handleInsertEmoji}>
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

          <Button
            onClick={onSend}
            disabled={!canSend || sending}
            size="icon"
            className={cn(
              "mb-0.5 h-7 w-7 shrink-0 rounded-xl transition-all",
              canSend
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-transparent text-muted-foreground hover:bg-transparent",
            )}
          >
            <Send size={16} />
          </Button>
        </div>
      </div>

      <p className="mt-1.5 hidden text-center text-[10px] text-muted-foreground sm:block">
        Enter để gửi · Shift+Enter xuống dòng
        {enableMentions ? " · @ để tag thành viên" : ""}
      </p>
    </div>
  );
}
