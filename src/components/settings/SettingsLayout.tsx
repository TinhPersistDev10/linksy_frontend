"use client";

import { useState } from "react";
import { User, Lock, Bell, Palette, Shield, LogOut } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import ProfileSettings from "./ProfileSettings";
import PasswordSettings from "./PasswordSettings";
import NotificationSettings from "./NotificationSettings";
import AppearanceSettings from "./AppearanceSettings";

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
    <div className="flex w-full h-full">
      {/* Settings Sidebar */}
      <nav className="w-64 shrink-0 border-r bg-muted/20 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
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

      {/* Settings Content */}
      <main className="flex-1 overflow-y-auto p-6 max-w-2xl">
        {renderContent()}
      </main>
    </div>
  );
}
