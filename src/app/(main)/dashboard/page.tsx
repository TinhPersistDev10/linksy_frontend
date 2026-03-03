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
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <span className="text-sm font-medium text-muted-foreground">
            {selectedChatroom
              ? selectedChatroom.members?.find(m => m.userId !== undefined)?.fullname || selectedChatroom.name
              : 'Linksy Chat'}
          </span>
        </header>

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