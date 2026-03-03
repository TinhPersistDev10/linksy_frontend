'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type Theme = 'light' | 'dark' | 'system';

const themes: { value: Theme; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'light', label: 'Sáng', icon: Sun, description: 'Giao diện sáng, phù hợp ban ngày' },
  { value: 'dark', label: 'Tối', icon: Moon, description: 'Giao diện tối, giảm mỏi mắt ban đêm' },
  { value: 'system', label: 'Theo hệ thống', icon: Monitor, description: 'Tự động theo cài đặt thiết bị' },
];

export default function AppearanceSettings() {
  const [theme, setTheme] = useState<Theme>('system');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    if (saved) setTheme(saved);
    const savedFont = localStorage.getItem('fontSize') as 'sm' | 'md' | 'lg' | null;
    if (savedFont) setFontSize(savedFont);
  }, []);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    if (t === 'dark') {
      root.classList.add('dark');
    } else if (t === 'light') {
      root.classList.remove('dark');
    } else {
      // system
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const handleThemeChange = (t: Theme) => {
    setTheme(t);
    applyTheme(t);
  };

  const handleSave = async () => {
    setIsSaving(true);
    localStorage.setItem('theme', theme);
    localStorage.setItem('fontSize', fontSize);
    await new Promise((r) => setTimeout(r, 600));
    setIsSaving(false);
    setSuccess('Đã lưu cài đặt giao diện!');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Giao diện</h2>
        <p className="text-sm text-muted-foreground mt-1">Tùy chỉnh giao diện theo sở thích của bạn</p>
      </div>

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Theme */}
      <div>
        <h3 className="text-sm font-medium mb-3">Chủ đề màu sắc</h3>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => {
            const Icon = t.icon;
            const isActive = theme === t.value;
            return (
              <button
                key={t.value}
                onClick={() => handleThemeChange(t.value)}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  isActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40 hover:bg-accent/30'
                }`}
              >
                {isActive && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <Check size={10} className="text-primary-foreground" />
                  </span>
                )}
                <Icon size={24} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                <span className={`text-sm font-medium ${isActive ? 'text-primary' : ''}`}>{t.label}</span>
                <span className="text-xs text-muted-foreground text-center leading-tight">{t.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t" />

      {/* Font size */}
      <div>
        <h3 className="text-sm font-medium mb-3">Cỡ chữ tin nhắn</h3>
        <div className="flex items-center gap-3">
          {(['sm', 'md', 'lg'] as const).map((size) => {
            const labels = { sm: 'Nhỏ', md: 'Vừa', lg: 'Lớn' };
            const textSizes = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' };
            return (
              <button
                key={size}
                onClick={() => setFontSize(size)}
                className={`flex-1 py-3 rounded-lg border-2 font-medium transition-all ${textSizes[size]} ${
                  fontSize === size
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                {labels[size]}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Áp dụng cho khung chat tin nhắn</p>
      </div>

      <div className="border-t pt-4">
        <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
          Lưu cài đặt
        </Button>
      </div>
    </div>
  );
}