// app/(main)/chat/page.tsx

"use client";

import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import { LogOut, User } from "lucide-react";

export default function ChatPage() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Linksy Chat</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <img
                src={
                  user.avatar
                    ? `${process.env.NEXT_PUBLIC_API_URL?.replace("/", "")}${user.avatar}`
                    : "/default-avatar.png"
                }
                alt={user.fullname}
                className="w-10 h-10 rounded-full"
                onError={(e) => {
                  e.currentTarget.src = "/default-avatar.png";
                }}
              />
              <div>
                <p className="font-medium text-gray-800">{user.fullname}</p>
                <p className="text-sm text-gray-500">@{user.username}</p>
              </div>
            </div>
            <Button
              onClick={logout}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <LogOut size={16} />
              <span>Đăng xuất</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <User size={64} className="mx-auto text-blue-600 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Xin chào, {user.fullname}! 👋
          </h2>
          <div className="text-left max-w-md mx-auto space-y-2">
            <p className="text-gray-600">
              <strong>User ID:</strong> {user.userId}
            </p>
            <p className="text-gray-600">
              <strong>Username:</strong> @{user.username}
            </p>
            <p className="text-gray-600">
              <strong>Email:</strong> {user.email}
            </p>
            <p className="text-gray-600">
              <strong>Ngày sinh:</strong>{" "}
              {new Date(user.dateOfBirth).toLocaleDateString("vi-VN")}
            </p>
            <p className="text-gray-600">
              <strong>Email verified:</strong>{" "}
              {user.isEmailVerified ? "✅" : "❌"}
            </p>
            <p className="text-gray-600">
              <strong>Đăng nhập lần cuối:</strong>{" "}
              {new Date(user.lastLoginAt).toLocaleString("vi-VN")}
            </p>
          </div>
          <p className="mt-6 text-gray-500">
            Trang chat đang được phát triển...
          </p>
        </div>
      </main>
    </div>
  );
}
