"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/switch";
import { settingsApi } from "@/lib/api/settings";
import { useAuth } from "@/lib/hooks/useAuth";
import { usePrivacySettingsQuery } from "@/lib/hooks/useServerStateQueries";
import { settingsQueryKeys } from "@/lib/queries/queryKeys";

export default function PrivacySettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: remoteSettings, isLoading } = usePrivacySettingsQuery(
    user?.userId,
  );
  const [blockStrangers, setBlockStrangers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!remoteSettings) return;
    setBlockStrangers(remoteSettings.whoCanMessageMe === "friends");
  }, [remoteSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    try {
      const saved = await settingsApi.updatePrivacy({
        whoCanMessageMe: blockStrangers ? "friends" : "everyone",
      });
      if (user?.userId) {
        queryClient.setQueryData(
          settingsQueryKeys.privacy(user.userId),
          saved,
        );
      }
      setBlockStrangers(saved.whoCanMessageMe === "friends");
      setSuccess("Đã lưu cài đặt quyền riêng tư!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Không thể lưu cài đặt quyền riêng tư";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Quyền riêng tư</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kiểm soát ai có thể nhắn tin và gọi cho bạn
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-border px-4 py-3">
            <div className="flex min-w-0 gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-700 dark:text-sky-300">
                <Shield size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  Không nhận tin nhắn / cuộc gọi từ người lạ
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Bật: chỉ bạn bè mới nhắn tin hoặc gọi được. Người lạ sẽ thấy
                  thông báo bạn không nhận liên hệ từ người lạ.
                </p>
              </div>
            </div>
            <Switch
              checked={blockStrangers}
              onCheckedChange={setBlockStrangers}
              aria-label="Chặn người lạ"
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>
      )}

      <Button
        type="button"
        onClick={() => void handleSave()}
        disabled={isSaving || isLoading}
      >
        {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
      </Button>
    </div>
  );
}
