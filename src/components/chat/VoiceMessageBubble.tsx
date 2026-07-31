"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatVoiceDuration } from "@/lib/hooks/useVoiceRecorder";

interface VoiceMessageBubbleProps {
  src: string;
  durationMs?: number | null;
  isOwn: boolean;
}

const WAVE_BARS = [3, 8, 5, 12, 7, 14, 6, 11, 4, 13, 8, 10, 5, 12, 7, 9, 4, 11];

export default function VoiceMessageBubble({
  src,
  durationMs,
  isOwn,
}: VoiceMessageBubbleProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentMs, setCurrentMs] = useState(0);
  const [knownDurationMs, setKnownDurationMs] = useState(durationMs ?? 0);

  useEffect(() => {
    setKnownDurationMs(durationMs ?? 0);
    setProgress(0);
    setCurrentMs(0);
    setPlaying(false);
  }, [src, durationMs]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      const dur =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration * 1000
          : knownDurationMs;
      if (dur > 0 && (!knownDurationMs || Math.abs(knownDurationMs - dur) > 250)) {
        setKnownDurationMs(dur);
      }
      const ms = audio.currentTime * 1000;
      setCurrentMs(ms);
      setProgress(dur > 0 ? Math.min(1, ms / dur) : 0);
    };

    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
      setCurrentMs(0);
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [knownDurationMs]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      return;
    }
    try {
      await audio.play();
    } catch {
      // Autoplay / gesture issues — ignore
    }
  };

  const displayMs = playing || progress > 0
    ? Math.max(0, (knownDurationMs || 0) - currentMs)
    : knownDurationMs || 0;

  return (
    <div
      className={cn(
        "flex min-w-[180px] max-w-[260px] items-center gap-2.5 py-0.5",
        isOwn ? "text-white" : "text-foreground",
      )}
    >
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

      <button
        type="button"
        onClick={() => void toggle()}
        aria-label={playing ? "Tạm dừng" : "Phát tin nhắn thoại"}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
          isOwn
            ? "bg-white/25 text-white hover:bg-white/35"
            : "bg-blue-500 text-white hover:bg-blue-600",
        )}
      >
        {playing ? (
          <Pause size={16} className="fill-current" />
        ) : (
          <Play size={16} className="ml-0.5 fill-current" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex h-6 items-end gap-[2px]">
          {WAVE_BARS.map((h, i) => {
            const filled = progress >= (i + 1) / WAVE_BARS.length;
            return (
              <span
                key={i}
                className={cn(
                  "w-[3px] rounded-full transition-colors",
                  filled
                    ? isOwn
                      ? "bg-white"
                      : "bg-blue-500"
                    : isOwn
                      ? "bg-white/35"
                      : "bg-foreground/25",
                )}
                style={{ height: `${h * 1.5}px` }}
              />
            );
          })}
        </div>
        <p
          className={cn(
            "mt-0.5 text-[11px] tabular-nums leading-none",
            isOwn ? "text-white/80" : "text-muted-foreground",
          )}
        >
          {formatVoiceDuration(displayMs)}
        </p>
      </div>
    </div>
  );
}
