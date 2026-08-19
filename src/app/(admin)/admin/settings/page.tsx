"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { AdminContentModerationSettings } from "@/components/admin/AdminContentModerationSettings";

export default function AdminSettingsPage() {
  return (
    <AdminShell title="Cài đặt">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Cài đặt hệ thống</h2>
          <p className="text-sm text-muted-foreground">
            Cấu hình các tính năng vận hành toàn hệ thống.
          </p>
        </div>
        <AdminContentModerationSettings />
      </div>
    </AdminShell>
  );
}
