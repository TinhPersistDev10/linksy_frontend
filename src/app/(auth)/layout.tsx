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
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isAuthenticated && user?.isEmailVerified) return null;

  return <>{children}</>;
}
