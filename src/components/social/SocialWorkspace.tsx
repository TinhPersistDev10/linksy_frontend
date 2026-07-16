"use client";

import {
  ArrowLeft,
  Users,
  UserRoundPlus,
  UserPlus,
  UsersRound,
} from "lucide-react";
import FriendsDirectoryView from "./FriendsDirectoryView";
import FriendRequestsView from "./FriendRequestsView";
import GroupsDirectoryView from "./GroupsDirectoryView";
import GroupInvitationsView from "./GroupInvitationsView";
import type { SocialView } from "@/components/sidebar/app-sidebar";
import type { ChatroomResponse } from "@/lib/types/chatroom";

interface SocialWorkspaceProps {
  view: SocialView;
  onBack?: () => void;
  onSelectChat?: (chatroom: ChatroomResponse) => void;
}

const viewMeta: Record<Exclude<SocialView, "messages">, {
  title: string;
  icon: React.ElementType;
}> = {
  "friends-directory": {
    title: "Danh sách bạn bè",
    icon: Users,
  },
  "groups-directory": {
    title: "Danh sách nhóm",
    icon: UsersRound,
  },
  "friend-requests": {
    title: "Lời mời kết bạn",
    icon: UserPlus,
  },
  "group-invitations": {
    title: "Lời mời vào nhóm",
    icon: UserRoundPlus,
  },
};

export default function SocialWorkspace({
  view,
  onBack,
  onSelectChat,
}: SocialWorkspaceProps) {
  if (view === "messages") return null;

  const meta = viewMeta[view];
  const Icon = meta.icon;

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-white text-slate-900">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 sm:h-16 sm:px-6">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Quay lại"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <Icon size={22} />
        <h1 className="min-w-0 truncate text-base font-semibold">
          {meta.title}
        </h1>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
        {view === "friends-directory" && (
          <FriendsDirectoryView onSelectChat={onSelectChat} />
        )}
        {view === "groups-directory" && (
          <GroupsDirectoryView onSelectChat={onSelectChat} />
        )}
        {view === "friend-requests" && <FriendRequestsView onSelectChat={onSelectChat} />}
        {view === "group-invitations" && <GroupInvitationsView />}
      </main>
    </section>
  );
}
