"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { WebRtcManager } from "./WebRtcManager";
// ── Types ─────────────────────────────────────────────────────────────────────

export type CallType = "audio" | "video";

export type CallStatus = "idle" | "calling" | "incoming" | "active" | "ended";

export interface CallState {
  status: CallStatus;
  callLogId: string | null;
  callType: CallType | null;
  remoteUserId: string | null;
  chatroomId: string | null;
  isMicOn: boolean;
  isCamOn: boolean;
  durationSec: number;
  startedAt: Date | null;
  _pendingSdpOffer?: string;
}

export interface CallEndedInfo {
  callLogId: string;
  chatroomId: string;
  callType: CallType;
  durationSec: number;
  wasInitiator: boolean;
}

const INITIAL: CallState = {
  status: "idle",
  callLogId: null,
  callType: null,
  remoteUserId: null,
  chatroomId: null,
  isMicOn: true,
  isCamOn: true,
  durationSec: 0,
  startedAt: null,
};

// ── Payloads từ server — khớp với ChatHub.cs ─────────────────────────────────

interface CallLogDto {
  id: string;
  chatroomId: string;
  callerId: string;
  callType: string;
  status: string;
  startedAt: string | null;
  answeredAt: string | null;
  endedAt: string | null;
  durationSec: number | null;
  participants: Array<{ userId: string; role: string }>;
}

/** InitiateCall → Clients.Caller.SendAsync("CallInitiated", CallLogDto) */
type CallInitiatedPayload = CallLogDto;

/** IncomingCall payload */
interface IncomingCallPayload {
  callLogId: string;
  callerId: string;
  chatroomId: string;
  callType: CallType;
  sdpOffer: string;
}

/** AnswerCall → { Call: CallLogDto, AnsweredBy, SdpAnswer } */
interface CallAnsweredPayload {
  call: CallLogDto;
  answeredBy: string;
  sdpAnswer: string;
}

/** RejectCall → { Call: CallLogDto, RejectedBy } */
interface CallRejectedPayload {
  call: CallLogDto;
  rejectedBy: string;
}

/** EndCall → { Call: CallLogDto, EndedBy } */
interface CallEndedPayload {
  call: CallLogDto;
  endedBy: string;
}

interface IceCandidatePayload {
  callLogId: string;
  fromUserId: string;
  candidateJson: string;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseCallSignalROptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connectionRef: RefObject<any>;
  isConnected: boolean;
  currentUserId: string;
  localVideoRef: RefObject<HTMLVideoElement | null>;
  remoteVideoRef: RefObject<HTMLVideoElement | null>;
  onCallEnded?: (info: CallEndedInfo) => void;
}

export interface UseCallSignalRReturn {
  callState: CallState;
  initiateCall: (chatroomId: string, callType: CallType) => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMic: () => void;
  toggleCam: () => void;
}

export function useCallSignalR({
  connectionRef,
  isConnected,
  currentUserId: _currentUserId,
  localVideoRef,
  remoteVideoRef,
  onCallEnded,
}: UseCallSignalROptions): UseCallSignalRReturn {
  const [callState, setCallState] = useState<CallState>(INITIAL);

  const stateRef = useRef<CallState>(INITIAL);
  const managerRef = useRef<WebRtcManager | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCallEndedRef = useRef(onCallEnded);
  onCallEndedRef.current = onCallEnded;
  const isInitiatorRef = useRef(false);

  // Resolve/reject của Promise chờ "CallInitiated" event
  const callInitiatedResolveRef = useRef<((id: string) => void) | null>(null);
  const callInitiatedRejectRef = useRef<((err: Error) => void) | null>(null);

  const updateState = useCallback((patch: Partial<CallState>) => {
    setCallState((prev) => {
      const next = { ...prev, ...patch };
      stateRef.current = next;
      return next;
    });
  }, []);

  // ── Timer ─────────────────────────────────────────────────────────────────

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setCallState((prev) => {
        if (prev.status !== "active") return prev;
        const next = { ...prev, durationSec: prev.durationSec + 1 };
        stateRef.current = next;
        return next;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ── Cleanup ───────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    stopTimer();
    managerRef.current?.destroy();
    managerRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallState(INITIAL);
    stateRef.current = INITIAL;
    isInitiatorRef.current = false;
    callInitiatedRejectRef.current?.(new Error("Call ended before initiated"));
    callInitiatedResolveRef.current = null;
    callInitiatedRejectRef.current = null;
  }, [stopTimer, localVideoRef, remoteVideoRef]);

  // ── createManager ─────────────────────────────────────────────────────────

  const createManager = useCallback((): WebRtcManager => {
    const manager = new WebRtcManager(
      async (candidateJson) => {
        const { callLogId, remoteUserId } = stateRef.current;
        const conn = connectionRef.current;
        if (!conn || !callLogId || !remoteUserId) return;
        try {
          await conn.invoke(
            "SendIceCandidate",
            callLogId,
            remoteUserId,
            candidateJson,
          );
        } catch (err) {
          console.error("[Call] SendIceCandidate failed:", err);
        }
      },
      (remoteStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      },
      (connectionState) => {
        if (
          (connectionState === "failed" ||
            connectionState === "disconnected") &&
          stateRef.current.status === "active"
        ) {
          cleanup();
        }
      },
    );
    managerRef.current = manager;
    return manager;
  }, [connectionRef, cleanup, remoteVideoRef]);

  // ── activateCall ──────────────────────────────────────────────────────────

  const activateCall = useCallback(() => {
    updateState({ status: "active", startedAt: new Date() });
    startTimer();
  }, [updateState, startTimer]);

  // ── initiateCall ──────────────────────────────────────────────────────────

  const initiateCall = useCallback(
    async (chatroomId: string, callType: CallType) => {
      const conn = connectionRef.current;
      if (!conn) throw new Error("SignalR chưa kết nối.");
      if (stateRef.current.status !== "idle")
        throw new Error("Đang có cuộc gọi khác.");

      const manager = createManager();
      isInitiatorRef.current = true;

      try {
        const localStream = await manager.getLocalStream(callType);
        if (localVideoRef.current)
          localVideoRef.current.srcObject = localStream;

        manager.createPeerConnection();
        const sdpOffer = await manager.createOffer();

        // ✅ Server gửi "CallInitiated" event, KHÔNG return qua invoke()
        const callLogId = await new Promise<string>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            callInitiatedResolveRef.current = null;
            callInitiatedRejectRef.current = null;
            reject(new Error("Timeout: server không phản hồi InitiateCall"));
          }, 10_000);

          callInitiatedResolveRef.current = (id: string) => {
            clearTimeout(timeoutId);
            resolve(id);
          };
          callInitiatedRejectRef.current = (err: Error) => {
            clearTimeout(timeoutId);
            reject(err);
          };

          conn
            .invoke("InitiateCall", chatroomId, callType, sdpOffer)
            .catch((err: unknown) => {
              clearTimeout(timeoutId);
              callInitiatedResolveRef.current = null;
              callInitiatedRejectRef.current = null;
              reject(err);
            });
        });

        updateState({
          status: "calling",
          callLogId,
          callType,
          chatroomId,
          isMicOn: true,
          isCamOn: callType === "video",
        });
      } catch (err) {
        manager.destroy();
        managerRef.current = null;
        isInitiatorRef.current = false;
        const raw = (err as Error)?.message ?? "";
        const [, msg] = raw.includes("|") ? raw.split("|") : [null, raw];
        throw new Error(msg ?? raw);
      }
    },
    [connectionRef, createManager, localVideoRef, updateState],
  );

  // ── answerCall ────────────────────────────────────────────────────────────

  const answerCall = useCallback(async () => {
    const conn = connectionRef.current;
    const { callLogId, callType, _pendingSdpOffer } = stateRef.current;
    if (!conn || !callLogId || stateRef.current.status !== "incoming") return;

    const manager = managerRef.current;
    if (!manager || !_pendingSdpOffer) return;

    try {
      // Lấy stream trước
      const localStream = await manager.getLocalStream(callType!);
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

      // Tạo PC sau khi có stream (createPeerConnection tự gắn tracks từ this.localStream)
      manager.createPeerConnection();

      const sdpAnswer = await manager.handleOffer(_pendingSdpOffer);
      await conn.invoke("AnswerCall", callLogId, sdpAnswer);
      updateState({
        isMicOn: true,
        isCamOn: callType === "video",
        _pendingSdpOffer: undefined,
      });
      activateCall();
    } catch (err) {
      console.error("[Call] AnswerCall failed:", err);
      cleanup();
    }
  }, [connectionRef, cleanup, activateCall, localVideoRef, updateState]);
  // ── rejectCall ────────────────────────────────────────────────────────────

  const rejectCall = useCallback(async () => {
    const conn = connectionRef.current;
    const { callLogId } = stateRef.current;
    if (!conn || !callLogId) return;
    try {
      await conn.invoke("RejectCall", callLogId);
    } catch (err) {
      console.error("[Call] RejectCall failed:", err);
    } finally {
      cleanup();
    }
  }, [connectionRef, cleanup]);

  // ── endCall ───────────────────────────────────────────────────────────────

  const endCall = useCallback(async () => {
    const conn = connectionRef.current;
    const { callLogId } = stateRef.current;
    if (!conn || !callLogId) return;
    try {
      await conn.invoke("EndCall", callLogId);
    } catch (err) {
      console.error("[Call] EndCall failed:", err);
    } finally {
      cleanup();
    }
  }, [connectionRef, cleanup]);

  // ── toggleMic / toggleCam ─────────────────────────────────────────────────

  const toggleMic = useCallback(() => {
    const next = !stateRef.current.isMicOn;
    managerRef.current?.setMicEnabled(next);
    updateState({ isMicOn: next });
  }, [updateState]);

  const toggleCam = useCallback(() => {
    const next = !stateRef.current.isCamOn;
    managerRef.current?.setCamEnabled(next);
    updateState({ isCamOn: next });
  }, [updateState]);

  // ── SignalR event listeners ───────────────────────────────────────────────

  useEffect(() => {
    if (!isConnected) return;
    const conn = connectionRef.current;
    if (!conn) return;

    // ✅ "CallInitiated" — server gửi CallLogDto thẳng (không wrap)
    const onCallInitiated = (payload: CallInitiatedPayload) => {
      callInitiatedResolveRef.current?.(payload.id);
      callInitiatedResolveRef.current = null;
      callInitiatedRejectRef.current = null;
    };

    // IncomingCall
    const onIncomingCall = async (payload: IncomingCallPayload) => {
      if (stateRef.current.status !== "idle") {
        try {
          await conn.invoke("RejectCall", payload.callLogId);
        } catch {}
        return;
      }

      // Chỉ lưu manager, CHƯA tạo PC và CHƯA lấy stream
      const manager = createManager();
      isInitiatorRef.current = false;

      updateState({
        status: "incoming",
        callLogId: payload.callLogId,
        callType: payload.callType,
        remoteUserId: payload.callerId,
        chatroomId: payload.chatroomId,
        _pendingSdpOffer: payload.sdpOffer,
      });
    };

    // ✅ FIX: đọc payload.call.id thay vì payload.callLogId
    const onCallAnswered = async (payload: CallAnsweredPayload) => {
      const callLogId = payload.call?.id;
      if (!callLogId || stateRef.current.callLogId !== callLogId) return;

      const manager = managerRef.current;
      if (!manager) return;
      try {
        await manager.handleAnswer(payload.sdpAnswer);
        updateState({ remoteUserId: payload.answeredBy });
        activateCall(); // ✅ Caller active ngay
      } catch (err) {
        console.error("[Call] handleAnswer failed:", err);
        cleanup();
      }
    };

    // ✅ FIX: đọc payload.call.id
    const onCallRejected = (payload: CallRejectedPayload) => {
      const callLogId = payload.call?.id;
      if (!callLogId || stateRef.current.callLogId !== callLogId) return;
      cleanup();
    };

    // ✅ FIX: đọc payload.call.id và payload.call.durationSec
    const onCallEnded = (payload: CallEndedPayload) => {
      const callLogId = payload.call?.id;
      if (!callLogId || stateRef.current.callLogId !== callLogId) return;

      const { chatroomId, callType, durationSec, startedAt } = stateRef.current;
      const finalDuration =
        payload.call.durationSec ??
        (startedAt
          ? Math.floor((Date.now() - startedAt.getTime()) / 1000)
          : durationSec);

      if (chatroomId && callType) {
        onCallEndedRef.current?.({
          callLogId,
          chatroomId,
          callType,
          durationSec: finalDuration,
          wasInitiator: isInitiatorRef.current,
        });
      }

      cleanup();
    };
    //call failed
    const onCallFailed = (payload: { callLogId: string; reason: string }) => {
      const currentCallLogId = stateRef.current.callLogId;
      if (currentCallLogId !== null && currentCallLogId !== payload.callLogId)
        return;
      console.warn("[Call], CallFailed: ", payload.reason);
      cleanup();
    };

    // IceCandidate
    const onIceCandidate = async (payload: IceCandidatePayload) => {
      if (stateRef.current.callLogId !== payload.callLogId) return;
      const manager = managerRef.current;
      if (!manager) return;
      try {
        await manager.addIceCandidate(payload.candidateJson);
      } catch (err) {
        console.error("[Call] addIceCandidate failed:", err);
      }
    };

    conn.on("CallInitiated", onCallInitiated);
    conn.on("IncomingCall", onIncomingCall);
    conn.on("CallAnswered", onCallAnswered);
    conn.on("CallRejected", onCallRejected);
    conn.on("CallEnded", onCallEnded);
    conn.on("IceCandidate", onIceCandidate);
    conn.on("CallFailed", onCallFailed);
    return () => {
      conn.off("CallInitiated", onCallInitiated);
      conn.off("IncomingCall", onIncomingCall);
      conn.off("CallAnswered", onCallAnswered);
      conn.off("CallRejected", onCallRejected);
      conn.off("CallEnded", onCallEnded);
      conn.off("IceCandidate", onIceCandidate);
      conn.off("CallFailed", onCallFailed);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isConnected, // ← trigger chính: chờ connection sẵn sàng
    activateCall, // ← giữ lại để tránh stale closure
    cleanup,
    createManager,
    updateState,
  ]);

  useEffect(() => () => cleanup(), [cleanup]);

  return {
    callState,
    initiateCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleCam,
  };
}
