"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || !isAuthenticated || !user) return;

    if (user.isEmailVerified) {
      router.replace("/dashboard");
      return;
    }

    if (pathname !== "/verify-email") {
      router.replace(`/verify-email?email=${encodeURIComponent(user.email)}`);
    }
  }, [loading, isAuthenticated, user, pathname, router]);

  if (loading) {
    return (
      <div className="auth-light flex h-screen w-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (isAuthenticated && user?.isEmailVerified) return null;

  return <div className="auth-light min-h-screen">{children}</div>;
}
