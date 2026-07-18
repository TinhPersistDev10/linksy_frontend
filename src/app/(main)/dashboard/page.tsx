"use client";

import { useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useChatSignalR } from "@/lib/hooks/useChatSignalR";
import { useCallSignalR } from "@/lib/hooks/useCallSignalR";
import { useChatroomsQuery } from "@/lib/hooks/useServerStateQueries";
import { AppSidebar, type SocialView } from "@/components/sidebar/app-sidebar";
import ChatWindowLayout from "@/components/chat/ChatWindowLayout";
import IncomingCallModal from "@/components/chat/IncomingCallModal";
import ActiveCallScreen from "@/components/chat/ActiveCallScreen";
import SocialWorkspace from "@/components/social/SocialWorkspace";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { ChatroomResponse } from "@/lib/types/chatroom";
import { cn } from "@/lib/utils/cn";

export default function Page() {
  const { loading } = useAuth();

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

  return <DashboardShell />;
}

function DashboardShell() {
  const { user } = useAuth();
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const [socialView, setSocialView] = useState<SocialView>("messages");
  const [selectedChatroom, setSelectedChatroom] =
    useState<ChatroomResponse | null>(null);
  const isContentOpenOnMobile = Boolean(selectedChatroom) || socialView !== "messages";
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const { data: chatrooms = [] } = useChatroomsQuery(user?.userId);
  const syncCallChatroomIds = useMemo(
    () => chatrooms.map((chatroom) => chatroom.chatroomId),
    [chatrooms],
  );

  const {
    isConnected: isGlobalCallConnected,
    connectionRef: globalCallConnectionRef,
  } = useChatSignalR({
    chatroomId: null,
    onReceiveMessage: () => undefined,
    onMessageDeleted: () => undefined,
    onMessageEdited: () => undefined,
    onMessageRead: () => undefined,
    onMessageDelivered: () => undefined,
    onAllMessagesRead: () => undefined,
    onUserTyping: () => undefined,
    onUserStoppedTyping: () => undefined,
    onMembershipChanged: () => setSidebarRefresh((value) => value + 1),
  });

  const callController = useCallSignalR({
    connectionRef: globalCallConnectionRef,
    isConnected: isGlobalCallConnected,
    currentUserId: user?.userId ?? "",
    syncChatroomIds: syncCallChatroomIds,
    localVideoRef,
    remoteVideoRef,
  });

  const callChatroom = useMemo(
    () =>
      chatrooms.find(
        (chatroom) => chatroom.chatroomId === callController.callState.chatroomId,
      ) ??
      (selectedChatroom?.chatroomId === callController.callState.chatroomId
        ? selectedChatroom
        : null),
    [chatrooms, callController.callState.chatroomId, selectedChatroom],
  );

  const remoteCallMember = callChatroom?.members?.find(
    (member) => member.userId === callController.callState.remoteUserId,
  );

  const callParticipants = callController.callState.participants.map(
    (participant) => {
      const member = callChatroom?.members?.find(
        (item) => item.userId === participant.userId,
      );

      return {
        ...participant,
        name: participant.isLocal
          ? user?.fullname || "Bạn"
          : member?.fullname || member?.username || "Người dùng",
        avatar: participant.isLocal ? user?.avatar ?? null : member?.avatar ?? null,
      };
    },
  );

  const remoteDisplayName = callController.callState.isGroup
    ? callChatroom?.roomName || "Cuộc gọi nhóm"
    : remoteCallMember?.fullname || remoteCallMember?.username || "Người dùng";
  const remoteDisplayAvatar = callController.callState.isGroup
    ? callChatroom?.avatar ?? null
    : remoteCallMember?.avatar ?? null;

  const openChatroom = (chatroom: ChatroomResponse) => {
    setSelectedChatroom(chatroom);
    setSocialView("messages");
    setSidebarRefresh((v) => v + 1);
  };

  return (
    <SidebarProvider className="h-svh min-h-0 overflow-hidden">
      <AppSidebar
        mobileHidden={isContentOpenOnMobile}
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
      <SidebarInset
        className={cn(
          "h-svh min-h-0 min-w-0 overflow-hidden",
          isContentOpenOnMobile ? "flex" : "hidden md:flex",
        )}
      >
        <div className="flex h-full min-h-0 flex-1 overflow-hidden">
          {socialView === "messages" ? (
            <ChatWindowLayout
              chatroom={selectedChatroom}
              callController={callController}
              onBack={() => setSelectedChatroom(null)}
              onReadChatroom={() => setSidebarRefresh((v) => v + 1)}
              onOpenChatroom={openChatroom}
              onChatroomUpdated={(updatedChatroom) => {
                setSelectedChatroom(updatedChatroom);
                setSidebarRefresh((v) => v + 1);
              }}
            />
          ) : (
            <SocialWorkspace
              view={socialView}
              onBack={() => setSocialView("messages")}
              onSelectChat={openChatroom}
            />
          )}
        </div>
      </SidebarInset>

      <IncomingCallModal
        callState={callController.callState}
        callerName={
          remoteCallMember?.fullname ||
          remoteCallMember?.username ||
          "Người dùng"
        }
        callerAvatar={remoteCallMember?.avatar ?? null}
        groupName={callChatroom?.roomName ?? null}
        onAnswer={() => void callController.answerCall()}
        onReject={() => void callController.rejectCall()}
      />

      <ActiveCallScreen
        callState={callController.callState}
        remoteName={remoteDisplayName}
        remoteAvatar={remoteDisplayAvatar}
        participants={callParticipants}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        onToggleMic={callController.toggleMic}
        onToggleCam={callController.toggleCam}
        onEndCall={() => void callController.endCall()}
      />
    </SidebarProvider>
  );
}
