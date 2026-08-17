"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { friendsApi } from "@/lib/api/friends";
import { toast } from "@/lib/stores/toastStore";
import { extractErrorMessage } from "@/lib/utils/extractErrorMessage";

export default function FriendInviteQrCard() {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const invite = await friendsApi.createInviteLink();
        if (cancelled) return;
        const origin = window.location.origin;
        setLink(`${origin}/add-friend?token=${invite.token}`);
      } catch (err) {
        if (!cancelled) {
          setError(
            extractErrorMessage(err, "Không thể tạo mã QR kết bạn."),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Đã sao chép liên kết");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể sao chép liên kết");
    }
  };

  return (
    <div className="rounded-xl border bg-muted/40 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <QrCode size={16} />
        Mã QR kết bạn
      </div>
      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-xl bg-white p-3">
            <QRCodeSVG value={link} size={168} />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Quét mã hoặc sao chép liên kết để kết bạn với bạn trong 7 ngày.
          </p>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Đã sao chép" : "Sao chép liên kết"}
          </button>
        </div>
      )}
    </div>
  );
}
