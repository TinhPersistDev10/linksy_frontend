'use client';

import { useState } from 'react';
import { Bell, MessageCircle, Users, AtSign, Volume2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/Button';

interface NotifSetting {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;
  enabled: boolean;
}

export default function NotificationSettings() {
  const [settings, setSettings] = useState<NotifSetting[]>([
    {
      id: 'messages',
      icon: MessageCircle,
      label: 'Tin nhắn trực tiếp',
      description: 'Nhận thông báo khi có tin nhắn mới',
      enabled: true,
    },
    {
      id: 'groups',
      icon: Users,
      label: 'Tin nhắn nhóm',
      description: 'Thông báo khi được nhắn trong nhóm',
      enabled: true,
    },
    {
      id: 'mentions',
      icon: AtSign,
      label: 'Nhắc đến bạn (@mention)',
      description: 'Thông báo khi ai đó @mention bạn',
      enabled: true,
    },
    {
      id: 'sounds',
      icon: Volume2,
      label: 'Âm thanh thông báo',
      description: 'Phát âm thanh khi nhận thông báo',
      enabled: false,
    },
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const toggle = (id: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 800));
    setIsSaving(false);
    setSuccess('Đã lưu cài đặt thông báo!');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Thông báo</h2>
        <p className="text-sm text-muted-foreground mt-1">Quản lý cách bạn nhận thông báo từ Linksy</p>
      </div>

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="space-y-2">
        {settings.map((setting) => {
          const Icon = setting.icon;
          return (
            <div
              key={setting.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{setting.label}</p>
                  <p className="text-xs text-muted-foreground">{setting.description}</p>
                </div>
              </div>
              <Switch
                checked={setting.enabled}
                onCheckedChange={() => toggle(setting.id)}
              />
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