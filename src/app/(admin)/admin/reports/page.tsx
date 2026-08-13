"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { AdminReportsList } from "@/components/admin/AdminReportsList";

export default function AdminReportsPage() {
  return (
    <AdminShell title="Báo cáo tài khoản">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Báo cáo tài khoản</h2>
          <p className="text-sm text-muted-foreground">
            Duyệt và xử lý báo cáo từ người dùng (kiểu Zalo / Messenger).
          </p>
        </div>
        <AdminReportsList />
      </div>
    </AdminShell>
  );
}
