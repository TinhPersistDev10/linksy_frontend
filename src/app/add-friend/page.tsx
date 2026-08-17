"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { friendsApi, type FriendInvitePreview } from "@/lib/api/friends";
import { toast } from "@/lib/stores/toastStore";
import { extractErrorMessage } from "@/lib/utils/extractErrorMessage";
import { Suspense } from "react";

function AddFriendLanding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const { isAuthenticated, loading } = useAuth();
  const [preview, setPreview] = useState<FriendInvitePreview | null>(null);
  const [error, setError] = useState("");
  const acceptedRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!token) {
      setError("Liên kết mời không hợp lệ.");
      return;
    }
    if (!isAuthenticated) {
      const returnUrl = `/add-friend?token=${encodeURIComponent(token)}`;
      router.replace(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const data = await friendsApi.getInvitePreview(token);
        if (!cancelled) setPreview(data);
      } catch (err) {
        if (!cancelled) {
          setError(extractErrorMessage(err, "Không tìm thấy lời mời kết bạn."));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loading, router, token]);

  useEffect(() => {
    if (loading || !isAuthenticated || !token || acceptedRef.current) return;
    acceptedRef.current = true;
    void (async () => {
      try {
        const result = await friendsApi.acceptInvite(token);
        if (result.status === "already_friends" || result.status === "friends") {
          toast.success("Các bạn đã là bạn bè.");
        } else {
          toast.success("Đã gửi lời mời kết bạn.");
        }
        router.replace("/dashboard");
      } catch (err) {
        acceptedRef.current = false;
        setError(extractErrorMessage(err, "Không thể chấp nhận lời mời."));
      }
    })();
  }, [isAuthenticated, loading, router, token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Lời mời kết bạn</h1>
        {preview && (
          <p className="mt-2 text-sm text-muted-foreground">
            {preview.fullname || preview.username} đã mời bạn kết bạn trên Linksy.
          </p>
        )}
        {error ? (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 size={22} className="animate-spin" />
            <p className="text-sm">Đang xử lý lời mời...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AddFriendPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AddFriendLanding />
    </Suspense>
  );
}
