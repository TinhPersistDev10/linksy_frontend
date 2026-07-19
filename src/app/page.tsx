"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Users, Shield, Zap } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { isSystemAdmin } from "@/lib/types/user";

export default function HomePage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated && user?.isEmailVerified) {
      router.replace(isSystemAdmin(user) ? "/admin" : "/dashboard");
    }
  }, [loading, isAuthenticated, user, router]);

  if (loading || (isAuthenticated && user?.isEmailVerified)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-gray-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <header className="container mx-auto flex items-center justify-between px-4 py-6">
        <div className="flex items-center space-x-2">
          <MessageCircle className="text-blue-600" size={32} />
          <span className="text-2xl font-bold text-gray-800">Linksy</span>
        </div>
        <div className="space-x-4">
          <Link
            href="/login"
            className="px-4 py-2 font-medium text-blue-600 hover:text-blue-700"
          >
            Đăng nhập
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Đăng ký
          </Link>
        </div>
      </header>

      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="mb-6 text-5xl font-bold text-gray-800 md:text-6xl">
          Kết nối mọi người,
          <br />
          <span className="text-blue-600">Mọi nơi, Mọi lúc</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-xl text-gray-600">
          Trò chuyện, chia sẻ và kết nối với bạn bè, gia đình một cách dễ dàng và
          bảo mật
        </p>
        <Link
          href="/register"
          className="inline-block rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-colors hover:bg-blue-700"
        >
          Bắt đầu ngay - Miễn phí
        </Link>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="rounded-xl bg-white p-8 text-center shadow-md">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Zap className="text-blue-600" size={32} />
            </div>
            <h3 className="mb-3 text-xl font-bold text-gray-800">Nhanh chóng</h3>
            <p className="text-gray-600">
              Tin nhắn được gửi đi trong tích tắc, không delay, không lag
            </p>
          </div>

          <div className="rounded-xl bg-white p-8 text-center shadow-md">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Shield className="text-green-600" size={32} />
            </div>
            <h3 className="mb-3 text-xl font-bold text-gray-800">Bảo mật</h3>
            <p className="text-gray-600">
              Mã hóa end-to-end, bảo vệ thông tin cá nhân tuyệt đối
            </p>
          </div>

          <div className="rounded-xl bg-white p-8 text-center shadow-md">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
              <Users className="text-purple-600" size={32} />
            </div>
            <h3 className="mb-3 text-xl font-bold text-gray-800">Kết nối</h3>
            <p className="text-gray-600">
              Nhóm chat, cuộc gọi video, chia sẻ file dễ dàng
            </p>
          </div>
        </div>
      </section>

      <footer className="container mx-auto border-t px-4 py-8 text-center text-gray-600">
        <p>&copy; 2026 Linksy. All rights reserved.</p>
      </footer>
    </div>
  );
}
