"use client";

/**
 * IncomingCallModal
 * Hiển thị khi có cuộc gọi đến (callState.status === "incoming").
 * Tự phát chuông reo bằng Web Audio API (không cần file âm thanh).
 *
 * Đặt file tại: src/components/chat/IncomingCallModal.tsx
 */

import { useEffect } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import type { CallState } from "@/lib/hooks/useCallSignalR";
import ChatAvatar from "./ChatAvatar";

interface IncomingCallModalProps {
  callState: CallState;
  callerName: string;
  callerAvatar?: string | null;
  groupName?: string | null;
  onAnswer: () => void;
  onReject: () => void;
}

export default function IncomingCallModal({
  callState,
  callerName,
  callerAvatar,
  groupName,
  onAnswer,
  onReject,
}: IncomingCallModalProps) {
  // Chuông reo bằng Web Audio API
  useEffect(() => {
    if (callState.status !== "incoming") return;

    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    let stopped = false;

    const ring = () => {
      if (stopped) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
      setTimeout(ring, 1400);
    };

    ring();
    return () => {
      stopped = true;
      ctx.close();
    };
  }, [callState.status]);

  if (callState.status !== "incoming") return null;

  const isVideo = callState.callType === "video";
  const isGroup = callState.isGroup;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-80 rounded-2xl bg-zinc-900 p-6 text-white shadow-2xl flex flex-col items-center gap-5">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white/10">
          <ChatAvatar src={callerAvatar ?? undefined} name={callerName} size={20} />
        </div>

        {/* Info */}
        <div className="text-center">
          <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">
            {isGroup
              ? isVideo
                ? "Cuộc gọi video nhóm"
                : "Cuộc gọi thoại nhóm"
              : isVideo
                ? "Cuộc gọi video đến"
                : "Cuộc gọi thoại đến"}
          </p>
          <p className="text-xl font-semibold">{callerName}</p>
          {isGroup && (
            <p className="mt-1 text-sm text-zinc-300">
              đã bắt đầu cuộc gọi nhóm {groupName || "này"}
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-10 mt-1">
          {/* Từ chối */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={onReject}
              aria-label="Từ chối"
              className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center shadow-lg"
            >
              <PhoneOff size={22} />
            </button>
            <span className="text-xs text-zinc-400">Từ chối</span>
          </div>

          {/* Chấp nhận */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={onAnswer}
              aria-label="Bắt máy"
              className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 active:scale-95 transition-all flex items-center justify-center shadow-lg animate-pulse"
            >
              {isVideo ? <Video size={22} /> : <Phone size={22} />}
            </button>
            <span className="text-xs text-zinc-400">
              {isVideo ? "Video" : "Bắt máy"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}