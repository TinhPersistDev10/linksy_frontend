"use client";

/**
 * ActiveCallScreen
 * Màn hình fullscreen khi đang gọi đi (calling) hoặc đang trong cuộc gọi (active).
 *
 * Đặt file tại: src/components/chat/ActiveCallScreen.tsx
 */

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, Video, VideoOff } from "lucide-react";
import type { CallParticipantView, CallState } from "@/lib/hooks/useCallSignalR";
import { cn } from "@/lib/utils/cn";
import ChatAvatar from "./ChatAvatar";

type CallScreenParticipant = CallParticipantView & {
  name: string;
  avatar?: string | null;
};

interface ActiveCallScreenProps {
  callState: CallState;
  remoteName: string;
  remoteAvatar?: string | null;
  participants?: CallScreenParticipant[];
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
  participants = [],
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
  const visibleParticipants =
    participants.length > 0
      ? participants
      : [
          {
            userId: "remote",
            isLocal: false,
            status: "joined",
            stream: null,
            name: remoteName,
            avatar: remoteAvatar,
          },
        ];

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col select-none">
      {/* ── Video area ──────────────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        {isVideo ? (
          <>
            <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
            <div
              className={cn(
                "grid h-full w-full gap-2 p-2 sm:gap-3 sm:p-4",
                visibleParticipants.length <= 1 && "grid-cols-1",
                visibleParticipants.length === 2 && "grid-cols-1 sm:grid-cols-2",
                visibleParticipants.length > 2 &&
                  "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
              )}
            >
              {visibleParticipants.map((participant) => (
                <ParticipantTile
                  key={participant.userId}
                  participant={participant}
                  videoRef={participant.isLocal ? localVideoRef : undefined}
                  muted={participant.isLocal}
                />
              ))}
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
            {visibleParticipants
              .filter((participant) => !participant.isLocal)
              .map((participant) => (
                <StreamVideo
                  key={participant.userId}
                  stream={participant.stream}
                  className="hidden"
                />
              ))}

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
      <div className="flex items-center justify-center gap-3 bg-zinc-900/95 px-4 py-4 backdrop-blur-sm sm:gap-5 sm:py-6">
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
          className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 shadow-lg transition-all hover:bg-red-600 active:scale-95 sm:h-14 sm:w-14"
        >
          <Phone size={22} className="rotate-[135deg]" />
        </button>
      </div>
    </div>
  );
}

function streamHasLiveVideo(stream: MediaStream | null): boolean {
  return Boolean(
    stream
      ?.getVideoTracks()
      .some(
        (track) =>
          track.readyState === "live" && track.enabled && !track.muted,
      ),
  );
}

function ParticipantTile({
  participant,
  videoRef,
  muted,
}: {
  participant: CallScreenParticipant;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  muted?: boolean;
}) {
  const internalRef = useRef<HTMLVideoElement | null>(null);
  const ref = videoRef ?? internalRef;
  const [hasVideo, setHasVideo] = useState(false);

  // Always attach the stream to the (always-mounted) video element as soon as
  // it is available, so we never miss a track that arrives after first render.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (video.srcObject !== (participant.stream ?? null)) {
      video.srcObject = participant.stream ?? null;
    }
    if (participant.stream) {
      const playPromise = video.play();
      if (playPromise) playPromise.catch(() => undefined);
    }
  }, [participant.stream, ref]);

  // Track video availability reactively: tracks can be added, removed, muted
  // or unmuted at any time during the call (e.g. the peer toggles their camera).
  useEffect(() => {
    const stream = participant.stream;
    if (!stream) {
      setHasVideo(false);
      return;
    }

    const update = () => setHasVideo(streamHasLiveVideo(stream));
    update();

    stream.addEventListener("addtrack", update);
    stream.addEventListener("removetrack", update);
    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach((track) => {
      track.addEventListener("mute", update);
      track.addEventListener("unmute", update);
      track.addEventListener("ended", update);
    });

    return () => {
      stream.removeEventListener("addtrack", update);
      stream.removeEventListener("removetrack", update);
      videoTracks.forEach((track) => {
        track.removeEventListener("mute", update);
        track.removeEventListener("unmute", update);
        track.removeEventListener("ended", update);
      });
    };
  }, [participant.stream]);

  return (
    <div className="relative min-h-0 overflow-hidden rounded-2xl bg-zinc-900 shadow-lg ring-1 ring-white/10">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className={cn(
          "h-full w-full object-cover",
          hasVideo ? "block" : "hidden",
        )}
      />
      {!hasVideo && (
        <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-3 text-white">
          <ChatAvatar
            src={participant.avatar ?? undefined}
            name={participant.name}
            size={24}
          />
          <p className="max-w-[80%] truncate text-sm font-medium">
            {participant.name}
          </p>
        </div>
      )}
      <div className="absolute bottom-2 left-2 max-w-[70%] rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white backdrop-blur">
        <span className="block truncate">
          {participant.isLocal ? "Bạn" : participant.name}
        </span>
      </div>
      {participant.connectionState === "disconnected" && (
        <div className="absolute right-2 top-2 rounded-full bg-amber-500/90 px-2 py-1 text-[11px] font-medium text-white">
          Đang nối lại
        </div>
      )}
    </div>
  );
}

function StreamVideo({
  stream,
  className,
}: {
  stream: MediaStream | null;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || !stream) return;
    if (video.srcObject !== stream) video.srcObject = stream;
    const playPromise = video.play();
    if (playPromise) playPromise.catch(() => undefined);
  }, [stream]);

  return <video ref={ref} autoPlay playsInline className={className} />;
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
        "flex h-11 w-11 items-center justify-center rounded-full transition-all active:scale-95 sm:h-12 sm:w-12",
        active
          ? "bg-white text-zinc-900"
          : "bg-zinc-700 text-white hover:bg-zinc-600",
      )}
    >
      {children}
    </button>
  );
}