"use client";

import { useEffect, useState } from "react";
import { Bell, Eye, Mail, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/switch";
import { settingsApi } from "@/lib/api/settings";
import type { NotificationSettingsData } from "@/lib/types/settings";

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

const defaults: Pick<NotificationSettingsData, NotifKey> = {
  notificationsEnabled: true,
  notificationSoundEnabled: true,
  messagePreviewEnabled: true,
  emailNotifications: false,
};

export default function NotificationSettings() {
  const [values, setValues] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void settingsApi
      .getAll()
      .then((settings) => {
        if (cancelled) return;
        const notif = settings.notificationSettings;
        if (!notif) return;
        setValues({
          notificationsEnabled: notif.notificationsEnabled,
          notificationSoundEnabled: notif.notificationSoundEnabled,
          messagePreviewEnabled: notif.messagePreviewEnabled,
          emailNotifications: notif.emailNotifications,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError("Không thể tải cài đặt thông báo");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (id: NotifKey) => {
    setValues((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    try {
      await settingsApi.updateNotifications(values);
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
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
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
                disabled={loading || isSaving}
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
          disabled={loading}
        >
          Lưu cài đặt
        </Button>
      </div>
    </div>
  );
}
