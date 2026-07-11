"use client";

/**
 * ActiveCallScreen
 * Màn hình fullscreen khi đang gọi đi (calling) hoặc đang trong cuộc gọi (active).
 *
 * Đặt file tại: src/components/chat/ActiveCallScreen.tsx
 */

import { Mic, MicOff, Phone, Video, VideoOff } from "lucide-react";
import type { CallState } from "@/lib/hooks/useCallSignalR";
import { cn } from "@/lib/utils/cn";
import ChatAvatar from "./ChatAvatar";

interface ActiveCallScreenProps {
  callState: CallState;
  remoteName: string;
  remoteAvatar?: string | null;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onEndCall: () => void;
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function ActiveCallScreen({
  callState,
  remoteName,
  remoteAvatar,
  localVideoRef,
  remoteVideoRef,
  onToggleMic,
  onToggleCam,
  onEndCall,
}: ActiveCallScreenProps) {
  const show =
    callState.status === "calling" || callState.status === "active";

  if (!show) return null;

  const isVideo = callState.callType === "video";
  const isCalling = callState.status === "calling";

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col select-none">
      {/* ── Video area ──────────────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        {isVideo ? (
          <>
            {/* Remote – full screen */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Local – picture-in-picture góc phải dưới */}
            <div className="absolute bottom-4 right-4 w-28 h-40 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl bg-zinc-800">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            {/* Overlay khi đang gọi đi */}
            {isCalling && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white gap-2">
                <div className="w-20 h-20 rounded-full overflow-hidden mb-2">
                  <ChatAvatar src={remoteAvatar ?? undefined} name={remoteName} size={20} />
                </div>
                <p className="text-xl font-semibold">{remoteName}</p>
                <p className="text-sm text-zinc-300 animate-pulse">Đang gọi…</p>
              </div>
            )}

            {/* Duration khi active */}
            {!isCalling && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2">
                <span className="text-white text-sm bg-black/40 px-3 py-1 rounded-full">
                  {formatDuration(callState.durationSec)}
                </span>
              </div>
            )}
          </>
        ) : (
          /* Audio call – không hiện video, chỉ avatar + thông tin */
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-white">
            {/* Audio elements vẫn cần để phát âm thanh */}
            <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
            <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />

            <div className="w-28 h-28 rounded-full overflow-hidden">
              <ChatAvatar src={remoteAvatar ?? undefined} name={remoteName} size={28} />
            </div>
            <p className="text-2xl font-semibold">{remoteName}</p>

            {isCalling ? (
              <p className="text-zinc-400 animate-pulse text-sm">Đang gọi…</p>
            ) : (
              <p className="text-zinc-400 text-sm tabular-nums">
                {formatDuration(callState.durationSec)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Control bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-5 py-6 bg-zinc-900/95 backdrop-blur-sm">
        {/* Mic */}
        <ControlBtn
          label={callState.isMicOn ? "Tắt mic" : "Bật mic"}
          active={!callState.isMicOn}
          onClick={onToggleMic}
        >
          {callState.isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
        </ControlBtn>

        {/* Camera – chỉ hiện khi video call */}
        {isVideo && (
          <ControlBtn
            label={callState.isCamOn ? "Tắt cam" : "Bật cam"}
            active={!callState.isCamOn}
            onClick={onToggleCam}
          >
            {callState.isCamOn ? <Video size={20} /> : <VideoOff size={20} />}
          </ControlBtn>
        )}

        {/* Kết thúc */}
        <button
          onClick={onEndCall}
          aria-label="Kết thúc cuộc gọi"
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center shadow-lg"
        >
          <Phone size={22} className="rotate-[135deg]" />
        </button>
      </div>
    </div>
  );
}

function ControlBtn({
  children,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95",
        active
          ? "bg-white text-zinc-900"
          : "bg-zinc-700 text-white hover:bg-zinc-600",
      )}
    >
      {children}
    </button>
  );
}