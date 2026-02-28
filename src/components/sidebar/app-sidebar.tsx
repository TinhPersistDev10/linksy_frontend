"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

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
import CreateNewChat from "../chat/CreateNewChat";
import NewGroupChatModal from "../chat/NewGroupChatModal";
import GroupChatList from "../chat/GroupChatList";
import AddFriendModal from "../chat/AddFriendModal";
import DirectMessageList from "../chat/DirectMessageList";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      {/* header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="bg-sky-500">
              <a href="#">
                <div className="flex w-full items-center px-2 justify-between">
                  <h1 className="text-xl front-bold  text-white">Linksy</h1>
                  <div className="flex items-cent gap-2 ">
                    <Sun className="size-4 text-white/80" />
                    <Switch
                      checked={true}
                      onCheckedChange={() => {}}
                      className="data-[state=checked]:bg-background/80"
                    />
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
        {/* New chat */}
        <SidebarGroup>
          <SidebarGroupContent>
            <CreateNewChat />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Group chat */}
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase">Nhóm chat </SidebarGroupLabel>
            <SidebarGroupAction title="Tạo nhóm" className="cursor-pointer">
              <NewGroupChatModal/>
            </SidebarGroupAction>

            <SidebarGroupContent>
              <GroupChatList/>
            </SidebarGroupContent>
          
        </SidebarGroup>

        {/* Direct chat */}
        <SidebarGroup>
          <SidebarGroupLabel> Kết bạn</SidebarGroupLabel>
            <SidebarGroupAction title="Kết bạn" className="cursor-pointer">
              <AddFriendModal/>
            </SidebarGroupAction>

            <SidebarGroupContent>
              <DirectMessageList/>
            </SidebarGroupContent>
         
        </SidebarGroup>
      </SidebarContent>

      {/* footer */}
      <SidebarFooter>{/* <NavUser user={data.user} /> */}</SidebarFooter>
    </Sidebar>
  );
}
