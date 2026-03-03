"use client";

import * as React from "react";
import { Moon, Sun, Settings, LogOut, UserPlus, Plus } from "lucide-react";
import SettingsPanel from "../settings/SettingsPanel";
import AddFriendModal from "../chat/AddFriendModal";
import DirectMessageList from "../chat/DirectMessageList";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/hooks/useAuth";
import type { Chatroom } from "@/lib/types/chatroom";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onSelectChat?: (chatroom: Chatroom) => void;
  selectedChatroomId?: string;
}

export function AppSidebar({ onSelectChat, selectedChatroomId, ...props }: AppSidebarProps) {
  const { user, logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [addFriendOpen, setAddFriendOpen] = React.useState(false);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  const initials = user?.fullname?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const handleFriendAdded = () => {
    setRefreshTrigger(p => p + 1);
  };

  return (
    <>
      <Sidebar variant="inset" {...props}>
        {/* Header */}
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="bg-sky-500">
                <a href="#">
                  <div className="flex w-full items-center px-2 justify-between">
                    <h1 className="text-xl font-bold text-white">Linksy</h1>
                    <div className="flex items-center gap-2">
                      <Sun className="size-4 text-white/80" />
                      <Switch checked={true} onCheckedChange={() => {}}
                        className="data-[state=checked]:bg-background/80" />
                      <Moon className="size-4 text-white/80" />
                    </div>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* Content */}
        <SidebarContent>
          {/* Direct Messages */}
          <SidebarGroup>
            <SidebarGroupLabel className="uppercase text-xs">Tin nhắn</SidebarGroupLabel>
            <SidebarGroupAction
              title="Kết bạn"
              className="cursor-pointer"
              onClick={() => setAddFriendOpen(true)}
            >
              <UserPlus size={14} />
            </SidebarGroupAction>
            <SidebarGroupContent>
              <DirectMessageList
                onSelectChat={onSelectChat || (() => {})}
                selectedChatroomId={selectedChatroomId}
                refreshTrigger={refreshTrigger}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter className="border-t">
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.fullname || 'Người dùng'}</p>
                  <p className="text-xs text-muted-foreground truncate">@{user?.username}</p>
                </div>
              </div>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setSettingsOpen(true)} className="cursor-pointer">
                <Settings size={16} />
                <span>Cài đặt</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={logout}
                className="cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10">
                <LogOut size={16} />
                <span>Đăng xuất</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AddFriendModal
        open={addFriendOpen}
        onClose={() => setAddFriendOpen(false)}
        onFriendAdded={handleFriendAdded}
      />
    </>
  );
}