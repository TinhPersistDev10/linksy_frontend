"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  MessageCircle,
  Users,
  PenSquare,
  Search,
  Settings,
  LogOut,
  Bell,
  Hash,
  UserPlus,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import SettingsPanel from "../settings/SettingsPanel";
import DirectMessageList from "../chat/DirectMessageList";
import StartChatModal from "../chat/StartChatModal";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/hooks/useAuth";
import type { ChatroomResponse } from "@/lib/types/chatroom";
import { cn } from "@/lib/utils/cn";
import NotificationList from "../notification/NotificationList";
import { useSidebarRealtime } from "@/lib/hooks/useSidebarRealtime";
import {
  useChatroomsQuery,
  useUnreadNotificationCountQuery,
} from "@/lib/hooks/useServerStateQueries";
import {
  chatroomQueryKeys,
  notificationQueryKeys,
} from "@/lib/queries/queryKeys";
import type { NotificationResponse } from "@/lib/types/notification";

export type SocialView =
  | "messages"
  | "friends-directory"
  | "groups-directory"
  | "friend-requests"
  | "group-invitations";
interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onSelectChat?: (chatroom: ChatroomResponse) => void;
  onOpenSocialView?: (view: SocialView) => void;
  selectedChatroomId?: string;
  refreshTrigger?: number;
  onRemovedFromGroup?: (chatroomId: string) => void;
}

type NavTab = "messages" | "friends" | "groups" | "notifications";
const navItems: { id: NavTab; icon: React.ElementType; label: string }[] = [
  { id: "messages", icon: MessageCircle, label: "Tin nhắn" },
  { id: "friends", icon: Users, label: "Bạn bè" },
  { id: "groups", icon: Hash, label: "Nhóm" },
  { id: "notifications", icon: Bell, label: "Thông báo" },
];

function Avatar({ src, name }: { src?: string; name: string }) {
  const initials =
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0 overflow-hidden">
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-xs font-bold text-white">{initials}</span>
      )}
    </div>
  );
}

function SocialMenuButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-12 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors",
        active
          ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent",
      )}
    >
      <Icon size={18} />
      <span className="truncate">{label}</span>
    </button>
  );
}

export function AppSidebar({
  onSelectChat,
  selectedChatroomId,
  refreshTrigger: externalRefreshTrigger = 0,
  onOpenSocialView,
  onRemovedFromGroup,
  ...props
}: AppSidebarProps) {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [startChatOpen, setStartChatOpen] = React.useState(false);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [activeTab, setActiveTab] = React.useState<NavTab>("messages");
  const [searchQuery, setSearchQuery] = React.useState("");
  const { data: chatrooms = [] } = useChatroomsQuery(user?.userId);
  const { data: notificationUnreadCount = 0 } =
    useUnreadNotificationCountQuery(user?.userId);
  const receivedNotificationIdsRef = React.useRef(new Set<string>());
  const previousExternalRefreshRef = React.useRef(externalRefreshTrigger);

  const messageUnreadCount = React.useMemo(
    () => chatrooms.reduce((total, room) => {
      if (room.chatroomId === selectedChatroomId) return total;
      return total + (room.unreadCount ?? 0);
    }, 0),
    [chatrooms, selectedChatroomId],
  );

  const handleNewNotification = React.useCallback(
    (notification: NotificationResponse) => {
      if (!user?.userId) return;
      if (receivedNotificationIdsRef.current.has(notification.notificationId)) {
        return;
      }
      receivedNotificationIdsRef.current.add(notification.notificationId);

      const listKey = notificationQueryKeys.list(user.userId, 1, 20);
      const countKey = notificationQueryKeys.unreadCount(user.userId);
      const cachedNotifications =
        queryClient.getQueryData<NotificationResponse[]>(listKey);
      const alreadyCached = cachedNotifications?.some(
        (item) => item.notificationId === notification.notificationId,
      );

      if (!notification.isRead && !alreadyCached) {
        const cachedCount = queryClient.getQueryData<number>(
          countKey,
        );
        if (typeof cachedCount === "number") {
          queryClient.setQueryData(
            countKey,
            cachedCount + 1,
          );
        } else {
          void queryClient.invalidateQueries({
            queryKey: countKey,
          });
        }
      }

      if (cachedNotifications) {
        queryClient.setQueryData<NotificationResponse[]>(
          listKey,
          [
            notification,
            ...cachedNotifications.filter(
              (item) => item.notificationId !== notification.notificationId,
            ),
          ].slice(0, 20),
        );
      }
    },
    [queryClient, user?.userId],
  );

  const handleNotificationReconnect = React.useCallback(() => {
    if (!user?.userId) return;
    receivedNotificationIdsRef.current.clear();
    void Promise.all([
      queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.unreadCount(user.userId),
      }),
      queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.list(user.userId, 1, 20),
      }),
    ]);
  }, [queryClient, user?.userId]);

  const handleNewMessage = React.useCallback(() => {
    if (!user?.userId) return;
    void queryClient.invalidateQueries({
      queryKey: chatroomQueryKeys.list(user.userId),
    });
  }, [queryClient, user?.userId]);

  const handleAddedToGroup = React.useCallback(
    (chatroom: ChatroomResponse) => {
      if (!user?.userId) return;
      queryClient.setQueryData<ChatroomResponse[]>(
        chatroomQueryKeys.list(user.userId),
        (current = []) => [
          chatroom,
          ...current.filter((item) => item.chatroomId !== chatroom.chatroomId),
        ],
      );
    },
    [queryClient, user?.userId],
  );

  const handleRemovedFromGroup = React.useCallback(
    (chatroomId: string) => {
      if (!user?.userId) return;
      queryClient.setQueryData<ChatroomResponse[]>(
        chatroomQueryKeys.list(user.userId),
        (current = []) => current.filter(
          (chatroom) => chatroom.chatroomId !== chatroomId,
        ),
      );
      onRemovedFromGroup?.(chatroomId);
    },
    [onRemovedFromGroup, queryClient, user?.userId],
  );

  React.useEffect(() => {
    if (previousExternalRefreshRef.current === externalRefreshTrigger) return;
    previousExternalRefreshRef.current = externalRefreshTrigger;
    if (!user?.userId) return;
    void queryClient.invalidateQueries({
      queryKey: chatroomQueryKeys.list(user.userId),
    });
  }, [externalRefreshTrigger, queryClient, user?.userId]);

  const [friendView, setFriendView] = React.useState<"friends" | "requests">(
    "friends",
  );
  const [currentSocialView, setCurrentSocialView] =
    React.useState<SocialView>("messages");
  const [avatarMenuOpen, setAvatarMenuOpen] = React.useState(false);

  useSidebarRealtime({
    enabled: Boolean(user),
    onNewMessage: handleNewMessage,
    onNewNotification: handleNewNotification,
    onReconnect: handleNotificationReconnect,
    onAddedToGroup: handleAddedToGroup,
    onRemovedFromGroup: handleRemovedFromGroup,
  });

  const openSocialView = (view: SocialView) => {
    setCurrentSocialView(view);
    onOpenSocialView?.(view);
  };

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    setSearchQuery("");

    if (tab === "messages") {
      openSocialView("messages");
    }

    if (tab === "friends") {
      setFriendView("friends");
      openSocialView("friends-directory");
    }

    if (tab === "groups") {
      openSocialView("groups-directory");
    }

    if (tab === "notifications") {
      openSocialView("messages");
    }
  };

  const handleFriendAdded = () => setRefreshTrigger((p) => p + 1);

  const handleStartChat = (chatroom: ChatroomResponse) => {
    handleTabChange("messages");
    onSelectChat?.(chatroom);
  };

  const tabLabel =
    navItems.find((n) => n.id === activeTab)?.label ?? "Tin nhắn";

  return (
    <>
      <div className="flex h-svh min-h-0 overflow-hidden">
        <div className="hidden md:flex flex-col items-center w-14 shrink-0 bg-sidebar border-r border-sidebar-border py-3 gap-1 z-20">
          <div className="w-8 h-8 rounded-xl bg-sky-500 flex items-center justify-center mb-3 shrink-0">
            <MessageCircle size={16} className="text-white" />
          </div>

          <div className="flex flex-col gap-1 flex-1">
            {navItems.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                title={label}
                className={cn(
                  "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all group",
                  activeTab === id
                    ? "bg-sky-500 text-white shadow-sm"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Icon size={18} />

                {id === "messages" && messageUnreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                    {messageUnreadCount > 99 ? "99+" : messageUnreadCount}
                  </span>
                )}

                {id === "notifications" && notificationUnreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                    {notificationUnreadCount > 99
                      ? "99+"
                      : notificationUnreadCount}
                  </span>
                )}

                <span className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                  {label}
                </span>
              </button>
            ))}
          </div>

          <div className="relative mt-auto flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setAvatarMenuOpen((open) => !open)}
              title={user?.fullname || "Tài khoản"}
              className="rounded-full outline-none ring-sky-400 transition focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <Avatar src={user?.avatar} name={user?.fullname || "U"} />
            </button>

            {avatarMenuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Đóng menu tài khoản"
                  className="fixed inset-0 z-40 cursor-default bg-transparent"
                  onClick={() => setAvatarMenuOpen(false)}
                />
                <div className="absolute bottom-0 left-full z-50 ml-2 w-44 rounded-lg border border-border bg-background p-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarMenuOpen(false);
                      setSettingsOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
                  >
                    <Settings size={15} />
                    <span>Cài đặt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarMenuOpen(false);
                      void logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                  >
                    <LogOut size={15} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <Sidebar
          collapsible="none"
          className="w-72 shrink-0 border-r border-sidebar-border flex flex-col h-full min-h-0"
          {...props}
        >
          <SidebarHeader className="px-4 py-3 border-b border-sidebar-border">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-sidebar-foreground">
                {tabLabel}
              </h2>
              <button
                onClick={() => setStartChatOpen(true)}
                title="Tìm bạn / Tạo chat mới"
                className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center hover:bg-sky-600 transition-colors shadow-sm"
              >
                <PenSquare size={14} />
              </button>
            </div>
            <div className="relative mt-2">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder={`Tìm trong ${tabLabel.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-muted/60 border border-transparent text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 placeholder:text-muted-foreground/60 transition-all"
              />
            </div>
          </SidebarHeader>

          <SidebarContent className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {activeTab === "messages" && (
              <DirectMessageList
                onSelectChat={onSelectChat || (() => {})}
                selectedChatroomId={selectedChatroomId}
                refreshTrigger={refreshTrigger}
                searchQuery={searchQuery}
              />
            )}

            {(activeTab === "friends" || activeTab === "groups") && (
              <div className="space-y-2 px-1">
                <SocialMenuButton
                  active={currentSocialView === "friends-directory"}
                  icon={Users}
                  label="Danh sách bạn bè"
                  onClick={() => {
                    setActiveTab("friends");
                    setFriendView("friends");
                    openSocialView("friends-directory");
                  }}
                />
                <SocialMenuButton
                  active={currentSocialView === "groups-directory"}
                  icon={UsersRound}
                  label="Danh sách nhóm"
                  onClick={() => {
                    setActiveTab("groups");
                    openSocialView("groups-directory");
                  }}
                />
                <SocialMenuButton
                  active={currentSocialView === "friend-requests"}
                  icon={UserPlus}
                  label="Lời mời kết bạn"
                  onClick={() => {
                    setActiveTab("friends");
                    setFriendView("requests");
                    openSocialView("friend-requests");
                  }}
                />
                <SocialMenuButton
                  active={currentSocialView === "group-invitations"}
                  icon={UserRoundPlus}
                  label="Lời mời vào nhóm"
                  onClick={() => {
                    setActiveTab("groups");
                    openSocialView("group-invitations");
                  }}
                />
              </div>
            )}

            {activeTab === "notifications" && (
              <NotificationList
                onOpenFriendRequests={() => {
                  setFriendView("requests");
                  setActiveTab("friends");
                  setSearchQuery("");
                  openSocialView("friend-requests");
                }}
              />
            )}
          </SidebarContent>

          <SidebarFooter className="border-t md:hidden px-3 py-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="flex items-center gap-3 px-1 py-1">
                  <Avatar src={user?.avatar} name={user?.fullname || "U"} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user?.fullname || "Người dùng"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{user?.username}
                    </p>
                  </div>
                </div>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setSettingsOpen(true)}
                  className="cursor-pointer"
                >
                  <Settings size={16} />
                  <span>Cài đặt</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={logout}
                  className="cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut size={16} />
                  <span>Đăng xuất</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <StartChatModal
        open={startChatOpen}
        onClose={() => setStartChatOpen(false)}
        onSelectChat={handleStartChat}
      />
    </>
  );
}
