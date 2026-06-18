"use client";

import { useEffect, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Theme = "light" | "dark" | "system";
type FontSize = "sm" | "md" | "lg";

const themes: { value: Theme; label: string; icon: React.ElementType; description: string }[] = [
  { value: "light", label: "Sáng", icon: Sun, description: "Giao diện sáng, phù hợp ban ngày" },
  { value: "dark", label: "Tối", icon: Moon, description: "Giao diện tối, giảm mỏi mắt ban đêm" },
  { value: "system", label: "Theo hệ thống", icon: Monitor, description: "Tự động theo cài đặt thiết bị" },
];

const fontSizes: Record<FontSize, string> = {
  sm: "14px",
  md: "16px",
  lg: "18px",
};

export default function AppearanceSettings() {
  const [theme, setTheme] = useState<Theme>("system");
  const [fontSize, setFontSize] = useState<FontSize>("md");
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    if (t === "dark") {
      root.classList.add("dark");
      return;
    }

    if (t === "light") {
      root.classList.remove("dark");
      return;
    }

    root.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);
  };

  const applyFontSize = (size: FontSize) => {
    document.documentElement.style.fontSize = fontSizes[size];
  };

  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme") as Theme | null) ?? "system";
    const savedFont = (localStorage.getItem("fontSize") as FontSize | null) ?? "md";
    setTheme(savedTheme);
    setFontSize(savedFont);
    applyTheme(savedTheme);
    applyFontSize(savedFont);
  }, []);

  const handleThemeChange = (nextTheme: Theme) => {
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  const handleFontSizeChange = (nextSize: FontSize) => {
    setFontSize(nextSize);
    applyFontSize(nextSize);
  };

  const handleSave = async () => {
    setIsSaving(true);
    localStorage.setItem("theme", theme);
    localStorage.setItem("fontSize", fontSize);
    setIsSaving(false);
    setSuccess("Đã lưu cài đặt giao diện!");
    setTimeout(() => setSuccess(""), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Giao diện</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tùy chỉnh giao diện theo sở thích của bạn
        </p>
      </div>

      {success && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      <div>
        <h3 className="mb-3 text-sm font-medium">Chủ đề màu sắc</h3>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((item) => {
            const Icon = item.icon;
            const isActive = theme === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => handleThemeChange(item.value)}
                className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                  isActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent/30"
                }`}
              >
                {isActive && (
                  <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                    <Check size={10} className="text-primary-foreground" />
                  </span>
                )}
                <Icon size={24} className={isActive ? "text-primary" : "text-muted-foreground"} />
                <span className={`text-sm font-medium ${isActive ? "text-primary" : ""}`}>{item.label}</span>
                <span className="text-center text-xs leading-tight text-muted-foreground">{item.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t" />

      <div>
        <h3 className="mb-3 text-sm font-medium">Cỡ chữ tin nhắn</h3>
        <div className="flex items-center gap-3">
          {(["sm", "md", "lg"] as const).map((size) => {
            const labels = { sm: "Nhỏ", md: "Vừa", lg: "Lớn" };
            const textSizes = { sm: "text-sm", md: "text-base", lg: "text-lg" };
            return (
              <button
                key={size}
                type="button"
                onClick={() => handleFontSizeChange(size)}
                className={`flex-1 rounded-lg border-2 py-3 font-medium transition-all ${textSizes[size]} ${
                  fontSize === size ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"
                }`}
              >
                {labels[size]}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Áp dụng cho giao diện trò chuyện</p>
      </div>

      <div className="border-t pt-4">
        <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
          Lưu cài đặt
        </Button>
      </div>
    </div>
  );
}
