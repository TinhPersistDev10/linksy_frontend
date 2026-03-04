"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import ChatWindowLayout from "@/components/chat/ChatWindowLayout";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import type { Chatroom } from "@/lib/types/chatroom";

export default function Page() {
  const [selectedChatroom, setSelectedChatroom] = useState<Chatroom | null>(null);

  return (
    <SidebarProvider>
      <AppSidebar
        onSelectChat={setSelectedChatroom}
        selectedChatroomId={selectedChatroom?.chatroomId}
      />
      <SidebarInset>

        {/* Chat area */}
        <div className="flex flex-1 overflow-hidden">
          <ChatWindowLayout
            chatroom={selectedChatroom}
            onBack={() => setSelectedChatroom(null)}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}