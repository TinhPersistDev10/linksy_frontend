"use client";

import { useEffect, useState } from "react";
import {
  useAdminContentModerationSettingsQuery,
  useUpdateContentModerationSettingsMutation,
} from "@/lib/hooks/useAdminQueries";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import Button from "@/components/ui/Button";
import { toast } from "@/lib/stores/toastStore";
import { extractErrorMessage } from "@/lib/utils/extractErrorMessage";

function wordsToText(words: string[]): string {
  return words.join("\n");
}

function textToWords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split("\n")
        .map((w) => w.trim())
        .filter(Boolean),
    ),
  );
}

export function AdminContentModerationSettings() {
  const query = useAdminContentModerationSettingsQuery();
  const updateMutation = useUpdateContentModerationSettingsMutation();

  const [enabled, setEnabled] = useState(true);
  const [wordsText, setWordsText] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!query.data || dirty) return;
    setEnabled(query.data.enabled);
    setWordsText(wordsToText(query.data.bannedWords));
  }, [query.data, dirty]);

  const handleToggle = async (next: boolean) => {
    setEnabled(next);
    try {
      await updateMutation.mutateAsync({ enabled: next });
      toast.success(next ? "Đã bật lọc từ khóa vi phạm" : "Đã tắt lọc từ khóa vi phạm");
    } catch (err) {
      setEnabled(!next);
      toast.error(extractErrorMessage(err, "Cập nhật thất bại"));
    }
  };

  const handleSaveWords = async () => {
    try {
      const bannedWords = textToWords(wordsText);
      await updateMutation.mutateAsync({ enabled, bannedWords });
      setWordsText(wordsToText(bannedWords));
      setDirty(false);
      toast.success("Đã lưu danh sách từ khóa");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Lưu thất bại"));
    }
  };

  if (query.isLoading) {
    return (
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-medium">Lọc từ khóa vi phạm</h3>
          <p className="text-sm text-muted-foreground">
            Khi bật, tin nhắn/câu hỏi khảo sát chứa từ khóa trong danh sách bên
            dưới sẽ bị chặn ngay lập tức, áp dụng cho toàn bộ người dùng.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => void handleToggle(checked)}
          disabled={updateMutation.isPending}
        />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">
          Danh sách từ khóa cấm (mỗi từ/cụm từ một dòng)
        </label>
        <Textarea
          value={wordsText}
          onChange={(e) => {
            setWordsText(e.target.value);
            setDirty(true);
          }}
          rows={10}
          className="mt-1 font-mono text-xs"
          placeholder={"vi_du\ncum tu vi du"}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        {query.data?.updatedAt && (
          <span className="mr-auto text-xs text-muted-foreground">
            Cập nhật lần cuối:{" "}
            {new Date(query.data.updatedAt).toLocaleString("vi-VN")}
          </span>
        )}
        <Button
          variant="outline"
          disabled={!dirty || updateMutation.isPending}
          onClick={() => {
            if (!query.data) return;
            setWordsText(wordsToText(query.data.bannedWords));
            setDirty(false);
          }}
        >
          Hoàn tác
        </Button>
        <Button
          disabled={!dirty}
          isLoading={updateMutation.isPending}
          onClick={() => void handleSaveWords()}
        >
          Lưu danh sách
        </Button>
      </div>
    </div>
  );
}
