"use client";

import { useEffect, useState } from "react";
import { Bell, ChevronRight, Lock, Palette, Shield, ShieldBan, User, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import AppearanceSettings from "./AppearanceSettings";
import BlockedUsersSettings from "./BlockedUsersSettings";
import NotificationSettings from "./NotificationSettings";
import PasswordSettings from "./PasswordSettings";
import PrivacySettings from "./PrivacySettings";
import ProfileSettings from "./ProfileSettings";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  /** When opening, jump straight into this settings section (e.g. "profile"). */
  initialTab?: string | null;
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
    id: "privacy",
    label: "Quyền riêng tư",
    icon: Shield,
    description: "Tin nhắn & cuộc gọi từ người lạ",
  },
  {
    id: "appearance",
    label: "Giao diện",
    icon: Palette,
    description: "Dark mode, cỡ chữ",
  },
  {
    id: "blocked",
    label: "Người đã chặn",
    icon: ShieldBan,
    description: "Xem và bỏ chặn",
  },
];

export default function SettingsPanel({
  open,
  onClose,
  initialTab = null,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setActiveTab(null);
      return;
    }
    setActiveTab(initialTab);
  }, [open, initialTab]);

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileSettings />;
      case "password":
        return <PasswordSettings />;
      case "notifications":
        return <NotificationSettings />;
      case "privacy":
        return <PrivacySettings />;
      case "appearance":
        return <AppearanceSettings />;
      case "blocked":
        return <BlockedUsersSettings />;
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
                    isActive
                      ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                      : "text-foreground hover:bg-accent",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                      isActive
                        ? "bg-sky-500/20 text-sky-700 dark:text-sky-300"
                        : "bg-muted text-muted-foreground group-hover:bg-background",
                    )}
                  >
                    <Icon
                      size={18}
                      className={
                        isActive
                          ? "text-sky-700 dark:text-sky-300"
                          : "text-muted-foreground"
                      }
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isActive && "text-sky-700 dark:text-sky-300",
                      )}
                    >
                      {item.label}
                    </p>
                    <p
                      className={cn(
                        "truncate text-xs",
                        isActive
                          ? "text-sky-700/70 dark:text-sky-300/70"
                          : "text-muted-foreground",
                      )}
                    >
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight
                    size={14}
                    className={cn(
                      "shrink-0 transition-transform",
                      isActive
                        ? "rotate-90 text-sky-700 dark:text-sky-300"
                        : "text-muted-foreground",
                    )}
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15">
                    {(() => {
                      const Icon = activeItem.icon;
                      return (
                        <Icon size={16} className="text-sky-700 dark:text-sky-300" />
                      );
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
