"use client";

import { useState } from "react";
import { X, User, Lock, Bell, Palette, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import ProfileSettings from "./ProfileSettings";
import PasswordSettings from "./PasswordSettings";
import NotificationSettings from "./NotificationSettings";
import AppearanceSettings from "./AppearanceSettings";

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
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full bg-background shadow-2xl border-l flex transition-all duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
          activeTab ? "w-[680px]" : "w-80",
        )}
      >
        {/* Left: Nav list */}
        <div className="w-80 shrink-0 flex flex-col border-r h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="text-base font-semibold">Cài đặt</h2>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(isActive ? null : item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all group",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "hover:bg-accent",
                  )}
                >
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                      isActive
                        ? "bg-white/20"
                        : "bg-muted group-hover:bg-background",
                    )}
                  >
                    <Icon
                      size={18}
                      className={
                        isActive
                          ? "text-primary-foreground"
                          : "text-muted-foreground"
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isActive ? "text-primary-foreground" : "",
                      )}
                    >
                      {item.label}
                    </p>
                    <p
                      className={cn(
                        "text-xs truncate",
                        isActive
                          ? "text-primary-foreground/70"
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
                        ? "text-primary-foreground rotate-90"
                        : "text-muted-foreground",
                    )}
                  />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Content */}
        {activeTab && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Sub-header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b shrink-0">
              {activeItem && (
                <>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    {(() => {
                      const Icon = activeItem.icon;
                      return <Icon size={16} className="text-primary" />;
                    })()}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">
                      {activeItem.label}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {activeItem.description}
                    </p>
                  </div>
                </>
              )}
              <button
                onClick={() => setActiveTab(null)}
                className="ml-auto w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-6">{renderContent()}</div>
          </div>
        )}
      </div>
    </>
  );
}
