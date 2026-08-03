"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_DURATION_MS = 60_000;
const MIN_DURATION_MS = 400;

export type VoiceRecorderStatus =
  | "idle"
  | "recording"
  | "stopping"
  | "denied"
  | "unsupported";

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function extensionForMime(mime: string): string {
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac"))
    return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

export function formatVoiceDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export type VoiceFile = File & { recordedDurationMs?: number };

interface UseVoiceRecorderOptions {
  maxDurationMs?: number;
  onError?: (message: string) => void;
  onAutoStop?: (file: VoiceFile | null) => void;
}

export function useVoiceRecorder({
  maxDurationMs = MAX_DURATION_MS,
  onError,
  onAutoStop,
}: UseVoiceRecorderOptions = {}) {
  const [status, setStatus] = useState<VoiceRecorderStatus>(() =>
    typeof window !== "undefined" && typeof MediaRecorder === "undefined"
      ? "unsupported"
      : "idle",
  );
  const [elapsedMs, setElapsedMs] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mimeTypeRef = useRef("audio/webm");
  const onAutoStopRef = useRef(onAutoStop);
  onAutoStopRef.current = onAutoStop;

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    stopTracks();
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    startedAtRef.current = 0;
    setElapsedMs(0);
    setStatus((prev) => (prev === "unsupported" ? prev : "idle"));
  }, [clearTimers, stopTracks]);

  useEffect(() => () => reset(), [reset]);

  const finishRecording = useCallback(
    (mode: "resolve" | "auto"): Promise<VoiceFile | null> => {
      return new Promise((resolve) => {
        const recorder = mediaRecorderRef.current;
        if (!recorder || recorder.state === "inactive") {
          reset();
          resolve(null);
          if (mode === "auto") onAutoStopRef.current?.(null);
          return;
        }

        setStatus("stopping");
        clearTimers();
        const duration = Date.now() - startedAtRef.current;

        recorder.onstop = () => {
          stopTracks();
          const mime = mimeTypeRef.current || "audio/webm";
          const blob = new Blob(chunksRef.current, { type: mime });
          chunksRef.current = [];
          mediaRecorderRef.current = null;
          setStatus("idle");
          setElapsedMs(0);

          if (duration < MIN_DURATION_MS || blob.size < 200) {
            resolve(null);
            if (mode === "auto") onAutoStopRef.current?.(null);
            return;
          }

          const ext = extensionForMime(mime);
          const file = new File([blob], `voice-${Date.now()}.${ext}`, {
            type: mime,
            lastModified: Date.now(),
          }) as VoiceFile;
          Object.defineProperty(file, "recordedDurationMs", {
            value: duration,
            enumerable: false,
          });
          resolve(file);
          if (mode === "auto") onAutoStopRef.current?.(file);
        };

        try {
          recorder.stop();
        } catch {
          reset();
          resolve(null);
          if (mode === "auto") onAutoStopRef.current?.(null);
        }
      });
    },
    [clearTimers, reset, stopTracks],
  );

  const start = useCallback(async () => {
    if (typeof MediaRecorder === "undefined") {
      setStatus("unsupported");
      onError?.("Trình duyệt không hỗ trợ ghi âm.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickMimeType();
      mimeTypeRef.current = mimeType?.split(";")[0] ?? "audio/webm";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.start(200);
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      setStatus("recording");

      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current);
      }, 200);

      maxTimerRef.current = setTimeout(() => {
        void finishRecording("auto");
      }, maxDurationMs);
    } catch {
      onError?.(
        "Không thể truy cập micro. Hãy cho phép quyền micro trong trình duyệt.",
      );
      reset();
      setStatus("denied");
    }
  }, [finishRecording, maxDurationMs, onError, reset]);

  const stopAndGetFile = useCallback(
    () => finishRecording("resolve"),
    [finishRecording],
  );

  const cancel = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    clearTimers();
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.ondataavailable = null;
        recorder.onstop = () => {
          stopTracks();
          chunksRef.current = [];
          mediaRecorderRef.current = null;
        };
        recorder.stop();
      } catch {
        stopTracks();
      }
    } else {
      stopTracks();
    }
    chunksRef.current = [];
    mediaRecorderRef.current = null;
    startedAtRef.current = 0;
    setElapsedMs(0);
    setStatus((prev) => (prev === "unsupported" ? prev : "idle"));
  }, [clearTimers, stopTracks]);

  return {
    status,
    isRecording: status === "recording",
    elapsedMs,
    maxDurationMs,
    formattedElapsed: formatVoiceDuration(elapsedMs),
    start,
    stopAndGetFile,
    cancel,
    reset,
  };
}
