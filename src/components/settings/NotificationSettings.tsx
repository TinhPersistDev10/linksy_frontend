"use client";

import { useEffect, useState } from "react";
import { AtSign, Bell, MessageCircle, Users, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/switch";

interface NotifSetting {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;
  enabled: boolean;
}

const defaultSettings: NotifSetting[] = [
  {
    id: "messages",
    icon: MessageCircle,
    label: "Tin nhắn trực tiếp",
    description: "Nhận thông báo khi có tin nhắn mới",
    enabled: true,
  },
  {
    id: "groups",
    icon: Users,
    label: "Tin nhắn nhóm",
    description: "Thông báo khi được nhắn trong nhóm",
    enabled: true,
  },
  {
    id: "mentions",
    icon: AtSign,
    label: "Nhắc đến bạn (@mention)",
    description: "Thông báo khi ai đó @mention bạn",
    enabled: true,
  },
  {
    id: "sounds",
    icon: Volume2,
    label: "Âm thanh thông báo",
    description: "Phát âm thanh khi nhận thông báo",
    enabled: false,
  },
];

export default function NotificationSettings() {
  const [settings, setSettings] = useState<NotifSetting[]>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("notificationSettings");
    if (!saved) return;

    try {
      const values = JSON.parse(saved) as Record<string, boolean>;
      setSettings((prev) => prev.map((item) => ({ ...item, enabled: values[item.id] ?? item.enabled })));
    } catch {
      localStorage.removeItem("notificationSettings");
    }
  }, []);

  const toggle = (id: string) => {
    setSettings((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const payload = Object.fromEntries(settings.map((item) => [item.id, item.enabled]));
    localStorage.setItem("notificationSettings", JSON.stringify(payload));
    setIsSaving(false);
    setSuccess("Đã lưu cài đặt thông báo!");
    setTimeout(() => setSuccess(""), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Thông báo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Quản lý cách bạn nhận thông báo từ Linksy
        </p>
      </div>

      {success && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      <div className="space-y-2">
        {settings.map((setting) => {
          const Icon = setting.icon;
          return (
            <div key={setting.id} className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent/30">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <Icon size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{setting.label}</p>
                  <p className="text-xs text-muted-foreground">{setting.description}</p>
                </div>
              </div>
              <Switch checked={setting.enabled} onCheckedChange={() => toggle(setting.id)} />
            </div>
          );
        })}
      </div>

      <div className="border-t pt-4">
        <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
          Lưu cài đặt
        </Button>
      </div>
    </div>
  );
}
