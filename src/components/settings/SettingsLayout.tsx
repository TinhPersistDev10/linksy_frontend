"use client";

import { useState } from "react";
import { Bell, Lock, Palette, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import AppearanceSettings from "./AppearanceSettings";
import NotificationSettings from "./NotificationSettings";
import PasswordSettings from "./PasswordSettings";
import ProfileSettings from "./ProfileSettings";

const navItems = [
  { id: "profile", label: "Thông tin cá nhân", icon: User },
  { id: "password", label: "Đổi mật khẩu", icon: Lock },
  { id: "notifications", label: "Thông báo", icon: Bell },
  { id: "appearance", label: "Giao diện", icon: Palette },
];

export default function SettingsLayout() {
  const [activeTab, setActiveTab] = useState("profile");

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
        return <ProfileSettings />;
    }
  };

  return (
    <div className="flex h-full w-full">
      <nav className="w-64 shrink-0 space-y-1 border-r bg-muted/20 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                activeTab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <main className="max-w-2xl flex-1 overflow-y-auto p-6">{renderContent()}</main>
    </div>
  );
}
