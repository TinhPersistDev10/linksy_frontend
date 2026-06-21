"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { AppSidebar, type SocialView } from "@/components/sidebar/app-sidebar";
import ChatWindowLayout from "@/components/chat/ChatWindowLayout";
import SocialWorkspace from "@/components/social/SocialWorkspace";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { ChatroomResponse } from "@/lib/types/chatroom";

export default function Page() {
  const { loading } = useAuth();
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const [socialView, setSocialView] = useState<SocialView>("messages");
  const [selectedChatroom, setSelectedChatroom] =
    useState<ChatroomResponse | null>(null);

  const openChatroom = (chatroom: ChatroomResponse) => {
    setSelectedChatroom(chatroom);
    setSocialView("messages");
    setSidebarRefresh((v) => v + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider className="h-svh min-h-0 overflow-hidden">
      <AppSidebar
        onSelectChat={openChatroom}
        selectedChatroomId={selectedChatroom?.chatroomId}
        refreshTrigger={sidebarRefresh}
        onRemovedFromGroup={(chatroomId) => {
          if (selectedChatroom?.chatroomId === chatroomId) {
            setSelectedChatroom(null);
          }
        }}
        onOpenSocialView={(view) => {
          setSocialView(view);
          if (view !== "messages") {
            setSelectedChatroom(null);
          }
        }}
      />
      <SidebarInset className="flex h-svh min-h-0 min-w-0 overflow-hidden">
        <div className="flex h-full min-h-0 flex-1 overflow-hidden">
          {socialView === "messages" ? (
            <ChatWindowLayout
              chatroom={selectedChatroom}
              onBack={() => setSelectedChatroom(null)}
              onReadChatroom={() => setSidebarRefresh((v) => v + 1)}
              onChatroomUpdated={(updatedChatroom) => {
                setSelectedChatroom(updatedChatroom);
                setSidebarRefresh((v) => v + 1);
              }}
            />
          ) : (
            <SocialWorkspace view={socialView} onSelectChat={openChatroom} />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
