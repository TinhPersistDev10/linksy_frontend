"use client";

import { useState } from "react";
import { Bell, ChevronRight, Lock, Palette, User, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import AppearanceSettings from "./AppearanceSettings";
import NotificationSettings from "./NotificationSettings";
import PasswordSettings from "./PasswordSettings";
import ProfileSettings from "./ProfileSettings";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  {
    id: "profile",
    label: "Thông tin cá nhân",
    icon: User,
    description: "Ảnh đại diện, tên, bio",
  },
  {
    id: "password",
    label: "Đổi mật khẩu",
    icon: Lock,
    description: "Bảo mật tài khoản",
  },
  {
    id: "notifications",
    label: "Thông báo",
    icon: Bell,
    description: "Quản lý thông báo",
  },
  {
    id: "appearance",
    label: "Giao diện",
    icon: Palette,
    description: "Dark mode, cỡ chữ",
  },
];

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileSettings />;
      case "password":
        return <PasswordSettings />;
      case "notifications":
        return <NotificationSettings />;
      case "appearance":
        return <AppearanceSettings />;
      default:
        return null;
    }
  };

  const activeItem = navItems.find((n) => n.id === activeTab);

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose} />}

      <div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full border-l bg-background shadow-2xl transition-all duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
          activeTab ? "w-[680px]" : "w-80",
        )}
      >
        <div className="flex h-full w-80 shrink-0 flex-col border-r">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-base font-semibold">Cài đặt</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(isActive ? null : item.id)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all",
                    isActive ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-accent",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                      isActive ? "bg-white/20" : "bg-muted group-hover:bg-background",
                    )}
                  >
                    <Icon size={18} className={isActive ? "text-primary-foreground" : "text-muted-foreground"} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-medium", isActive ? "text-primary-foreground" : "")}>{item.label}</p>
                    <p className={cn("truncate text-xs", isActive ? "text-primary-foreground/70" : "text-muted-foreground")}>{item.description}</p>
                  </div>
                  <ChevronRight
                    size={14}
                    className={cn("shrink-0 transition-transform", isActive ? "rotate-90 text-primary-foreground" : "text-muted-foreground")}
                  />
                </button>
              );
            })}
          </nav>
        </div>

        {activeTab && (
          <div className="flex h-full flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center gap-3 border-b px-5 py-4">
              {activeItem && (
                <>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    {(() => {
                      const Icon = activeItem.icon;
                      return <Icon size={16} className="text-primary" />;
                    })()}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{activeItem.label}</h3>
                    <p className="text-xs text-muted-foreground">{activeItem.description}</p>
                  </div>
                </>
              )}
              <button
                type="button"
                onClick={() => setActiveTab(null)}
                className="ml-auto flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">{renderContent()}</div>
          </div>
        )}
      </div>
    </>
  );
}
