'use client';

import { AppSidebar } from '@/components/sidebar/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import SettingsLayout from '@/components/settings/SettingsLayout';

export default function SettingsPage() {
  return (
    <SidebarProvider className="h-svh min-h-0 overflow-hidden">
      <AppSidebar />
      <SidebarInset className="flex h-svh min-h-0 min-w-0 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <h1 className="text-lg font-semibold">Cài đặt</h1>
        </header>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <SettingsLayout />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}