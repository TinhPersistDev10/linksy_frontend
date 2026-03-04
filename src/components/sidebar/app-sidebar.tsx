"use client";

import * as React from "react";
import {
  MessageCircle, Users, PenSquare, Search,
  Settings, LogOut, Bell, Hash,
} from "lucide-react";
import SettingsPanel from "../settings/SettingsPanel";
import AddFriendModal from "../friend/AddFriendModal";
import DirectMessageList from "../chat/DirectMessageList";
import FriendsList from "../friend/FriendsList";

import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/hooks/useAuth";
import type { Chatroom } from "@/lib/types/chatroom";
import { cn } from "@/lib/utils/cn";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onSelectChat?: (chatroom: Chatroom) => void;
  selectedChatroomId?: string;
}

type NavTab = "messages" | "friends" | "groups" | "notifications";

const navItems: { id: NavTab; icon: React.ElementType; label: string }[] = [
  { id: "messages", icon: MessageCircle, label: "Tin nhắn" },
  { id: "friends", icon: Users, label: "Bạn bè" },
  { id: "groups", icon: Hash, label: "Nhóm" },
  { id: "notifications", icon: Bell, label: "Thông báo" },
];

function Avatar({ src, name }: { src?: string; name: string }) {
  const initials = name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0 overflow-hidden">
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" />
            : <span className="text-xs font-bold text-white">{initials}</span>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 gap-3 text-center px-4">
      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
        <Icon size={20} className="text-muted-foreground/60" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}

export function AppSidebar({ onSelectChat, selectedChatroomId, ...props }: AppSidebarProps) {
  const { user, logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [addFriendOpen, setAddFriendOpen] = React.useState(false);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [activeTab, setActiveTab] = React.useState<NavTab>("messages");
  const [searchQuery, setSearchQuery] = React.useState("");

  const handleTabChange = (tab: NavTab) => { setActiveTab(tab); setSearchQuery(""); };
  const handleFriendAdded = () => setRefreshTrigger(p => p + 1);
  const handleStartChat = (chatroom: Chatroom) => { handleTabChange("messages"); onSelectChat?.(chatroom); };

  const tabLabel = navItems.find(n => n.id === activeTab)?.label ?? "Tin nhắn";

  return (
    <>
      <div className="flex h-svh">
        {/* Icon Rail */}
        <div className="hidden md:flex flex-col items-center w-14 shrink-0 bg-sidebar border-r border-sidebar-border py-3 gap-1 z-20">
          <div className="w-8 h-8 rounded-xl bg-sky-500 flex items-center justify-center mb-3 shrink-0">
            <MessageCircle size={16} className="text-white" />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            {navItems.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => handleTabChange(id)} title={label}
                className={cn(
                  "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all group",
                  activeTab === id ? "bg-sky-500 text-white shadow-sm" : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}>
                <Icon size={18} />
                <span className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">{label}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col items-center gap-2 mt-auto">
            <button onClick={() => setSettingsOpen(true)} title="Cài đặt"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all group relative">
              <Settings size={16} />
              <span className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">Cài đặt</span>
            </button>
            <button onClick={logout} title="Đăng xuất"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sidebar-foreground/60 hover:bg-red-50 hover:text-red-500 transition-all group relative">
              <LogOut size={16} />
              <span className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">Đăng xuất</span>
            </button>
            <div className="mt-1"><Avatar src={user?.avatar} name={user?.fullname || "U"} /></div>
          </div>
        </div>

        {/* Sidebar Panel */}
        <Sidebar collapsible="none" className="w-72 shrink-0 border-r border-sidebar-border flex flex-col h-full" {...props}>
          <SidebarHeader className="px-4 py-3 border-b border-sidebar-border">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-sidebar-foreground">{tabLabel}</h2>
              <button onClick={() => setAddFriendOpen(true)} title="Tìm bạn / Tạo chat mới"
                className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center hover:bg-sky-600 transition-colors shadow-sm">
                <PenSquare size={14} />
              </button>
            </div>
            <div className="relative mt-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder={`Tìm trong ${tabLabel.toLowerCase()}...`}
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-muted/60 border border-transparent text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 placeholder:text-muted-foreground/60 transition-all" />
            </div>
          </SidebarHeader>

          <SidebarContent className="flex-1 overflow-y-auto px-2 py-2">
            {activeTab === "messages" && (
              <DirectMessageList onSelectChat={onSelectChat || (() => {})} selectedChatroomId={selectedChatroomId} refreshTrigger={refreshTrigger} searchQuery={searchQuery} />
            )}
            {activeTab === "friends" && (
              <FriendsList onStartChat={handleStartChat} searchQuery={searchQuery} refreshTrigger={refreshTrigger} />
            )}
            {activeTab === "groups" && <EmptyState icon={Hash} title="Chưa có nhóm nào" description="Tạo nhóm để trò chuyện cùng nhiều người" />}
            {activeTab === "notifications" && <EmptyState icon={Bell} title="Không có thông báo" description="Các thông báo mới sẽ xuất hiện ở đây" />}
          </SidebarContent>

          <SidebarFooter className="border-t md:hidden px-3 py-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="flex items-center gap-3 px-1 py-1">
                  <Avatar src={user?.avatar} name={user?.fullname || "U"} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.fullname || "Người dùng"}</p>
                    <p className="text-xs text-muted-foreground truncate">@{user?.username}</p>
                  </div>
                </div>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setSettingsOpen(true)} className="cursor-pointer"><Settings size={16} /><span>Cài đặt</span></SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={logout} className="cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"><LogOut size={16} /><span>Đăng xuất</span></SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AddFriendModal open={addFriendOpen} onClose={() => setAddFriendOpen(false)} onFriendAdded={handleFriendAdded} />
    </>
  );
}