"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdminRecentActivitiesQuery,
  useAdminStatisticsQuery,
} from "@/lib/hooks/useAdminQueries";

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-20" />
      ) : (
        <p className="mt-1 text-2xl font-semibold">{value ?? 0}</p>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const statsQuery = useAdminStatisticsQuery();
  const activitiesQuery = useAdminRecentActivitiesQuery(8);

  const stats = statsQuery.data;

  return (
    <AdminShell title="Tổng quan">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Thống kê hệ thống Linksy
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Tổng người dùng"
            value={stats?.totalUsers}
            loading={statsQuery.isLoading}
          />
          <StatCard
            label="Đang hoạt động"
            value={stats?.activeUsers}
            loading={statsQuery.isLoading}
          />
          <StatCard
            label="Không hoạt động"
            value={stats?.inactiveUsers}
            loading={statsQuery.isLoading}
          />
          <StatCard
            label="Tin nhắn"
            value={stats?.totalMessages}
            loading={statsQuery.isLoading}
          />
          <StatCard
            label="Phòng chat"
            value={stats?.totalChatrooms}
            loading={statsQuery.isLoading}
          />
          <StatCard
            label="User mới tháng này"
            value={stats?.newUsersThisMonth}
            loading={statsQuery.isLoading}
          />
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="font-medium">Hoạt động gần đây</h3>
          {activitiesQuery.isLoading ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : activitiesQuery.data?.length ? (
            <ul className="mt-3 space-y-2">
              {activitiesQuery.data.map((activity, index) => (
                <li
                  key={`${activity.timestamp}-${index}`}
                  className="text-sm text-muted-foreground"
                >
                  {activity.description}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Chưa có hoạt động gần đây.
            </p>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
