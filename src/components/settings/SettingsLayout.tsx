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
    <div className="flex h-full w-full min-w-0 flex-col md:flex-row">
      <nav className="flex shrink-0 gap-2 overflow-x-auto border-b bg-muted/20 p-2 md:w-64 md:flex-col md:space-y-1 md:overflow-visible md:border-b-0 md:border-r md:p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors md:w-full md:gap-3",
                activeTab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon size={18} />
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <main className="min-w-0 flex-1 overflow-y-auto p-3 sm:p-6 md:max-w-2xl">
        {renderContent()}
      </main>
    </div>
  );
}
