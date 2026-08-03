"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Eye, Mail, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/switch";
import { settingsApi } from "@/lib/api/settings";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  defaultNotificationSettings,
  useNotificationSettingsQuery,
} from "@/lib/hooks/useServerStateQueries";
import { settingsQueryKeys } from "@/lib/queries/queryKeys";
import type { NotificationSettingsData } from "@/lib/types/settings";
import { ensureNotificationPermission } from "@/lib/utils/browserNotification";

type NotifKey = keyof Pick<
  NotificationSettingsData,
  | "notificationsEnabled"
  | "notificationSoundEnabled"
  | "messagePreviewEnabled"
  | "emailNotifications"
>;

interface NotifSetting {
  id: NotifKey;
  icon: React.ElementType;
  label: string;
  description: string;
}

const settingDefs: NotifSetting[] = [
  {
    id: "notificationsEnabled",
    icon: Bell,
    label: "Bật thông báo",
    description: "Nhận thông báo từ Linksy",
  },
  {
    id: "notificationSoundEnabled",
    icon: Volume2,
    label: "Âm thanh thông báo",
    description: "Phát âm thanh khi nhận thông báo",
  },
  {
    id: "messagePreviewEnabled",
    icon: Eye,
    label: "Xem trước tin nhắn",
    description: "Hiển thị nội dung tin nhắn trong thông báo",
  },
  {
    id: "emailNotifications",
    icon: Mail,
    label: "Thông báo email",
    description: "Nhận thông báo qua email",
  },
];

export default function NotificationSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: remoteSettings, isLoading } = useNotificationSettingsQuery(
    user?.userId,
  );
  const [values, setValues] = useState(defaultNotificationSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!remoteSettings) return;
    setValues({
      notificationsEnabled: remoteSettings.notificationsEnabled,
      notificationSoundEnabled: remoteSettings.notificationSoundEnabled,
      messagePreviewEnabled: remoteSettings.messagePreviewEnabled,
      emailNotifications: remoteSettings.emailNotifications,
    });
  }, [remoteSettings]);

  const toggle = (id: NotifKey) => {
    setValues((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    try {
      if (values.notificationsEnabled) {
        await ensureNotificationPermission();
      }
      const saved = await settingsApi.updateNotifications(values);
      setValues({
        notificationsEnabled: saved.notificationsEnabled,
        notificationSoundEnabled: saved.notificationSoundEnabled,
        messagePreviewEnabled: saved.messagePreviewEnabled,
        emailNotifications: saved.emailNotifications,
      });
      if (user?.userId) {
        queryClient.setQueryData(settingsQueryKeys.detail(user.userId), saved);
      }
      setSuccess("Đã lưu cài đặt thông báo!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể lưu cài đặt thông báo";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Thông báo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Quản lý cách bạn nhận thông báo từ Linksy
        </p>
      </div>

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-300">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {settingDefs.map((setting) => {
          const Icon = setting.icon;
          return (
            <div
              key={setting.id}
              className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <Icon size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{setting.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {setting.description}
                  </p>
                </div>
              </div>
              <Switch
                checked={values[setting.id]}
                disabled={isLoading || isSaving}
                onCheckedChange={() => toggle(setting.id)}
              />
            </div>
          );
        })}
      </div>

      <div className="border-t pt-4">
        <Button
          variant="primary"
          onClick={() => void handleSave()}
          isLoading={isSaving}
          disabled={isLoading}
        >
          Lưu cài đặt
        </Button>
      </div>
    </div>
  );
}
