"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { GroupWebRtcManager } from "./GroupWebRtcManager";
// ── Types ─────────────────────────────────────────────────────────────────────

export type CallType = "audio" | "video";

export type CallStatus = "idle" | "calling" | "incoming" | "active" | "ended";

export interface CallParticipantView {
  userId: string;
  isLocal: boolean;
  status: string;
  stream: MediaStream | null;
  connectionState?: RTCPeerConnectionState;
}

export interface CallState {
  status: CallStatus;
  callLogId: string | null;
  callType: CallType | null;
  remoteUserId: string | null;
  chatroomId: string | null;
  isGroup: boolean;
  isMicOn: boolean;
  isCamOn: boolean;
  durationSec: number;
  startedAt: Date | null;
  participants: CallParticipantView[];
  _pendingSdpOffer?: string;
}

const INITIAL: CallState = {
  status: "idle",
  callLogId: null,
  callType: null,
  remoteUserId: null,
  chatroomId: null,
  isGroup: false,
  isMicOn: true,
  isCamOn: true,
  durationSec: 0,
  startedAt: null,
  participants: [],
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
  participants: Array<{
    userId: string;
    status: string;
    joinedAt: string | null;
    leftAt: string | null;
  }>;
}

/** InitiateCall → Clients.Caller.SendAsync("CallInitiated", CallLogDto) */
type CallInitiatedPayload = CallLogDto;

type GroupCallStartedPayload = CallLogDto;

/** IncomingCall payload */
interface IncomingCallPayload {
  callLogId: string;
  callerId: string;
  chatroomId: string;
  callType: CallType;
  sdpOffer: string;
}

interface IncomingGroupCallPayload {
  call: CallLogDto;
  callerId: string;
  chatroomId: string;
  callType: CallType;
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

interface CallOfferPayload {
  callLogId: string;
  fromUserId: string;
  sdpOffer: string;
}

interface CallAnswerPayload {
  callLogId: string;
  fromUserId: string;
  sdpAnswer: string;
}

interface CallParticipantChangedPayload {
  call: CallLogDto;
  joinedBy?: string;
  leftBy?: string;
}

interface IceRestartRequestedPayload {
  callLogId: string;
  fromUserId: string;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseCallSignalROptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connectionRef: RefObject<any>;
  isConnected: boolean;
  currentUserId: string;
  syncChatroomIds?: string[];
  localVideoRef: RefObject<HTMLVideoElement | null>;
  remoteVideoRef: RefObject<HTMLVideoElement | null>;
}

export interface UseCallSignalRReturn {
  callState: CallState;
  initiateCall: (
    chatroomId: string,
    callType: CallType,
    remoteUserIds?: string[],
  ) => Promise<void>;
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
  syncChatroomIds = [],
  localVideoRef,
  remoteVideoRef,
}: UseCallSignalROptions): UseCallSignalRReturn {
  const [callState, setCallState] = useState<CallState>(INITIAL);

  const stateRef = useRef<CallState>(INITIAL);
  const managerRef = useRef<GroupWebRtcManager | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInitiatorRef = useRef(false);
  const pendingOutgoingIceRef = useRef<Map<string, string[]>>(new Map());
  const pendingOffersRef = useRef<Map<string, string>>(new Map());
  // Shared call start time (ms epoch) used to keep the elapsed timer in sync
  // across every participant. Derived from the server's answeredAt timestamp.
  const callStartRef = useRef<number | null>(null);

  // Deterministic mesh negotiation: for any pair of peers only ONE side creates
  // the offer (the one with the greater userId). This removes offer glare and
  // "missing" peer connections when several participants join simultaneously.
  const isOffererFor = useCallback(
    (remoteUserId: string) => _currentUserId > remoteUserId,
    [_currentUserId],
  );

  const applyTimerBase = useCallback((answeredAtIso?: string | null) => {
    if (!answeredAtIso) return;
    const parsed = Date.parse(answeredAtIso);
    if (Number.isNaN(parsed)) return;
    callStartRef.current =
      callStartRef.current == null
        ? parsed
        : Math.min(callStartRef.current, parsed);
  }, []);

  // Resolve/reject của Promise chờ "CallInitiated" event
  const callInitiatedResolveRef = useRef<((id: string) => void) | null>(null);
  const callInitiatedRejectRef = useRef<((err: Error) => void) | null>(null);
  const groupCallStartedResolveRef = useRef<((call: CallLogDto) => void) | null>(
    null,
  );
  const groupCallStartedRejectRef = useRef<((err: Error) => void) | null>(null);

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
    const tick = () => {
      setCallState((prev) => {
        if (prev.status !== "active") return prev;
        const base = callStartRef.current ?? Date.now();
        const durationSec = Math.max(
          0,
          Math.floor((Date.now() - base) / 1000),
        );
        if (durationSec === prev.durationSec) return prev;
        const next = { ...prev, durationSec };
        stateRef.current = next;
        return next;
      });
    };
    timerRef.current = setInterval(tick, 1000);
    tick();
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
    callStartRef.current = null;
    pendingOutgoingIceRef.current.clear();
    pendingOffersRef.current.clear();
    callInitiatedRejectRef.current?.(new Error("Call ended before initiated"));
    groupCallStartedRejectRef.current?.(
      new Error("Call ended before group call started"),
    );
    callInitiatedResolveRef.current = null;
    callInitiatedRejectRef.current = null;
    groupCallStartedResolveRef.current = null;
    groupCallStartedRejectRef.current = null;
  }, [stopTimer, localVideoRef, remoteVideoRef]);

  // ── createManager ─────────────────────────────────────────────────────────

  const attachStreamToVideo = useCallback(
    (video: HTMLVideoElement | null, stream: MediaStream | null) => {
      if (!video || !stream) return;
      if (video.srcObject !== stream) video.srcObject = stream;
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch((err) => {
          console.warn("[Call] video.play() failed:", err);
        });
      }
    },
    [],
  );

  const setRemoteParticipantStream = useCallback(
    (userId: string, stream: MediaStream) => {
      updateState({
        participants: stateRef.current.participants.map((participant) =>
          participant.userId === userId ? { ...participant, stream } : participant,
        ),
      });

      if (!stateRef.current.remoteUserId || stateRef.current.remoteUserId === userId) {
        attachStreamToVideo(remoteVideoRef.current, stream);
      }
    },
    [attachStreamToVideo, remoteVideoRef, updateState],
  );

  const updateParticipantConnectionState = useCallback(
    (userId: string, connectionState: RTCPeerConnectionState) => {
      updateState({
        participants: stateRef.current.participants.map((participant) =>
          participant.userId === userId
            ? { ...participant, connectionState }
            : participant,
        ),
      });
    },
    [updateState],
  );

  const syncParticipantsFromCall = useCallback(
    (call: CallLogDto, localStream?: MediaStream | null) => {
      const existing = new Map(
        stateRef.current.participants.map((participant) => [
          participant.userId,
          participant,
        ]),
      );

      const participants = call.participants
        .filter(
          (participant) =>
            participant.status === "joined" ||
            participant.userId === _currentUserId,
        )
        .map((participant) => {
        const current = existing.get(participant.userId);
        const isLocal = participant.userId === _currentUserId;

        return {
          userId: participant.userId,
          isLocal,
          status: participant.status,
          stream: isLocal ? (localStream ?? current?.stream ?? null) : (current?.stream ?? null),
          connectionState: current?.connectionState,
        } satisfies CallParticipantView;
      });

      return participants;
    },
    [_currentUserId],
  );

  const flushOutgoingIce = useCallback(async (targetUserId?: string) => {
    const conn = connectionRef.current;
    const { callLogId } = stateRef.current;
    if (!conn || !callLogId) return;

    const userIds = targetUserId
      ? [targetUserId]
      : [...pendingOutgoingIceRef.current.keys()];

    for (const userId of userIds) {
      const candidates = pendingOutgoingIceRef.current.get(userId) ?? [];
      pendingOutgoingIceRef.current.delete(userId);

      for (const candidateJson of candidates) {
        try {
          await conn.invoke("SendIceCandidate", callLogId, userId, candidateJson);
        } catch (err) {
          pendingOutgoingIceRef.current.set(userId, [
            candidateJson,
            ...(pendingOutgoingIceRef.current.get(userId) ?? []),
          ]);
          console.error("[Call] SendIceCandidate failed:", err);
          break;
        }
      }
    }
  }, [connectionRef]);

  const sendOrQueueIce = useCallback(
    async (recipientUserId: string, candidateJson: string) => {
      const conn = connectionRef.current;
      const { callLogId } = stateRef.current;
      if (!conn || !callLogId) {
        pendingOutgoingIceRef.current.set(recipientUserId, [
          ...(pendingOutgoingIceRef.current.get(recipientUserId) ?? []),
          candidateJson,
        ]);
        return;
      }

      try {
        await conn.invoke("SendIceCandidate", callLogId, recipientUserId, candidateJson);
      } catch (err) {
        pendingOutgoingIceRef.current.set(recipientUserId, [
          ...(pendingOutgoingIceRef.current.get(recipientUserId) ?? []),
          candidateJson,
        ]);
        console.error("[Call] SendIceCandidate failed:", err);
      }
    },
    [connectionRef],
  );

  const createManager = useCallback((): GroupWebRtcManager => {
    const manager = new GroupWebRtcManager({
      onIceCandidate: (recipientUserId, candidateJson) => {
        void sendOrQueueIce(recipientUserId, candidateJson);
      },
      onRemoteStream: setRemoteParticipantStream,
      onConnectionState: (userId, connectionState) => {
        updateParticipantConnectionState(userId, connectionState);
      },
    });
    managerRef.current = manager;
    return manager;
  }, [
    sendOrQueueIce,
    setRemoteParticipantStream,
    updateParticipantConnectionState,
  ]);

  // ── activateCall ──────────────────────────────────────────────────────────

  const activateCall = useCallback(
    (answeredAtIso?: string | null) => {
      applyTimerBase(answeredAtIso);
      if (callStartRef.current == null) callStartRef.current = Date.now();
      updateState({
        status: "active",
        startedAt: new Date(callStartRef.current),
      });
      startTimer();
    },
    [applyTimerBase, updateState, startTimer],
  );

  // ── initiateCall ──────────────────────────────────────────────────────────

  const initiateCall = useCallback(
    async (
      chatroomId: string,
      callType: CallType,
      remoteUserIds: string[] = [],
    ) => {
      const conn = connectionRef.current;
      if (!conn) throw new Error("SignalR chưa kết nối.");
      if (stateRef.current.status !== "idle")
        throw new Error("Đang có cuộc gọi khác.");

      const targets = [...new Set(remoteUserIds.filter(Boolean))].filter(
        (userId) => userId !== _currentUserId,
      );
      if (targets.length === 0) {
        throw new Error("Không tìm thấy người nhận cuộc gọi.");
      }

      const manager = createManager();
      isInitiatorRef.current = true;

      try {
        const localStream = await manager.initLocalStream(callType);
        attachStreamToVideo(localVideoRef.current, localStream);

        if (targets.length === 1) {
          const remoteUserId = targets[0];
          const sdpOffer = await manager.createOffer(remoteUserId);

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
            remoteUserId,
            isGroup: false,
            isMicOn: true,
            isCamOn:
              callType === "video" && localStream.getVideoTracks().length > 0,
            participants: [
              {
                userId: _currentUserId,
                isLocal: true,
                status: "joined",
                stream: localStream,
              },
              {
                userId: remoteUserId,
                isLocal: false,
                status: "invited",
                stream: null,
              },
            ],
          });
          void flushOutgoingIce(remoteUserId);
          return;
        }

        const call = await new Promise<CallLogDto>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            groupCallStartedResolveRef.current = null;
            groupCallStartedRejectRef.current = null;
            reject(new Error("Timeout: server không phản hồi StartGroupCall"));
          }, 10_000);

          groupCallStartedResolveRef.current = (payload) => {
            clearTimeout(timeoutId);
            resolve(payload);
          };
          groupCallStartedRejectRef.current = (err: Error) => {
            clearTimeout(timeoutId);
            reject(err);
          };

          conn.invoke("StartGroupCall", chatroomId, callType).catch((err: unknown) => {
            clearTimeout(timeoutId);
            groupCallStartedResolveRef.current = null;
            groupCallStartedRejectRef.current = null;
            reject(err);
          });
        });

        applyTimerBase(call.answeredAt);
        updateState({
          status: "calling",
          callLogId: call.id,
          callType,
          chatroomId,
          remoteUserId: targets[0] ?? null,
          isGroup: true,
          isMicOn: true,
          isCamOn:
            callType === "video" && localStream.getVideoTracks().length > 0,
          participants: syncParticipantsFromCall(call, localStream),
        });

        // Do NOT pre-offer here. Peer connections are negotiated deterministically
        // as each invitee joins (see onCallParticipantJoined / answerCall), which
        // guarantees exactly one offer per pair and avoids glare.
      } catch (err) {
        manager.destroy();
        managerRef.current = null;
        isInitiatorRef.current = false;
        const raw = (err as Error)?.message ?? "";
        const [, msg] = raw.includes("|") ? raw.split("|") : [null, raw];
        throw new Error(msg ?? raw);
      }
    },
    [
      applyTimerBase,
      attachStreamToVideo,
      connectionRef,
      createManager,
      flushOutgoingIce,
      localVideoRef,
      _currentUserId,
      syncParticipantsFromCall,
      updateState,
    ],
  );

  const processOffer = useCallback(
    async (fromUserId: string, sdpOffer: string) => {
      const conn = connectionRef.current;
      const manager = managerRef.current;
      const { callLogId } = stateRef.current;
      if (!conn || !manager || !callLogId) return;

      const sdpAnswer = await manager.handleOffer(fromUserId, sdpOffer);
      await conn.invoke("SendCallAnswer", callLogId, fromUserId, sdpAnswer);
      void flushOutgoingIce(fromUserId);
    },
    [connectionRef, flushOutgoingIce],
  );

  const processPendingOffers = useCallback(async () => {
    const entries = [...pendingOffersRef.current.entries()];
    pendingOffersRef.current.clear();

    for (const [fromUserId, sdpOffer] of entries) {
      await processOffer(fromUserId, sdpOffer);
    }
  }, [processOffer]);

  const recoverSyncedCall = useCallback(
    async (call: CallLogDto) => {
      if (stateRef.current.status !== "idle") return;
      if (call.callType !== "audio" && call.callType !== "video") return;

      const localParticipant = call.participants.find(
        (participant) => participant.userId === _currentUserId,
      );
      if (!localParticipant || localParticipant.leftAt) return;

      const remoteParticipants = call.participants.filter(
        (participant) => participant.userId !== _currentUserId,
      );
      const firstRemote =
        remoteParticipants.find((participant) => participant.status === "joined") ??
        remoteParticipants[0];

      const isGroup = call.participants.length > 2;
      const isInvited = localParticipant.status === "invited";
      const manager = createManager();
      isInitiatorRef.current = false;

      if (isInvited) {
        updateState({
          status: "incoming",
          callLogId: call.id,
          callType: call.callType,
          remoteUserId: call.callerId,
          chatroomId: call.chatroomId,
          isGroup,
          participants: syncParticipantsFromCall(call),
        });
        return;
      }

      if (localParticipant.status !== "joined") return;

      try {
        const localStream = await manager.initLocalStream(call.callType);
        attachStreamToVideo(localVideoRef.current, localStream);
        updateState({
          status: call.status === "ringing" ? "calling" : "active",
          callLogId: call.id,
          callType: call.callType,
          remoteUserId: firstRemote?.userId ?? null,
          chatroomId: call.chatroomId,
          isGroup,
          isMicOn: true,
          isCamOn:
            call.callType === "video" && localStream.getVideoTracks().length > 0,
          participants: syncParticipantsFromCall(call, localStream),
        });

        if (call.status === "answered") activateCall(call.answeredAt);

        const conn = connectionRef.current;
        if (!conn) return;

        const joinedRemoteIds = remoteParticipants
          .filter((participant) => participant.status === "joined")
          .map((participant) => participant.userId);

        for (const remoteUserId of joinedRemoteIds) {
          const sdpOffer = await manager.createOffer(remoteUserId);
          await conn.invoke("SendCallOffer", call.id, remoteUserId, sdpOffer);
          void flushOutgoingIce(remoteUserId);
        }
      } catch (err) {
        console.error("[Call] SyncCallState recovery failed:", err);
        cleanup();
      }
    },
    [
      _currentUserId,
      activateCall,
      attachStreamToVideo,
      cleanup,
      connectionRef,
      createManager,
      flushOutgoingIce,
      localVideoRef,
      syncParticipantsFromCall,
      updateState,
    ],
  );

  const syncActiveCallState = useCallback(async () => {
    const conn = connectionRef.current;
    if (!conn || stateRef.current.status !== "idle") return;

    for (const chatroomId of syncChatroomIds) {
      if (stateRef.current.status !== "idle") return;

      try {
        const call = (await conn.invoke("SyncCallState", chatroomId)) as
          | CallLogDto
          | null;
        if (call) {
          await recoverSyncedCall(call);
          return;
        }
      } catch (err) {
        console.warn("[Call] SyncCallState failed:", err);
      }
    }
  }, [connectionRef, recoverSyncedCall, syncChatroomIds]);

  // ── answerCall ────────────────────────────────────────────────────────────

  const answerCall = useCallback(async () => {
    const conn = connectionRef.current;
    const { callLogId, callType, _pendingSdpOffer, remoteUserId, isGroup } =
      stateRef.current;
    if (!conn || !callLogId || stateRef.current.status !== "incoming") return;

    const manager = managerRef.current;
    if (!manager) return;

    try {
      const localStream = await manager.initLocalStream(callType!);
      attachStreamToVideo(localVideoRef.current, localStream);

      let joinedCall: CallLogDto | null = null;

      if (isGroup) {
        joinedCall = (await conn.invoke("JoinCall", callLogId)) as
          | CallLogDto
          | null;
      } else if (_pendingSdpOffer && remoteUserId) {
        const sdpAnswer = await manager.handleOffer(remoteUserId, _pendingSdpOffer);
        await conn.invoke("AnswerCall", callLogId, sdpAnswer);
      } else if (remoteUserId) {
        await conn.invoke("JoinCall", callLogId);
      }

      const nextParticipants = joinedCall
        ? syncParticipantsFromCall(joinedCall, localStream)
        : stateRef.current.participants.map((participant) =>
            participant.isLocal
              ? { ...participant, stream: localStream }
              : participant,
          );

      updateState({
        isMicOn: true,
        isCamOn:
          callType === "video" && localStream.getVideoTracks().length > 0,
        participants: nextParticipants,
        _pendingSdpOffer: undefined,
      });

      // Go active first so any offer that arrives now is processed immediately
      // (not queued), then reconcile queued offers + our deterministic offers.
      activateCall(joinedCall?.answeredAt);

      if (isGroup) {
        await processPendingOffers();

        const joinedRemotes = (joinedCall?.participants ?? [])
          .filter(
            (participant) =>
              participant.userId !== _currentUserId &&
              participant.status === "joined",
          )
          .map((participant) => participant.userId);

        for (const remoteUserId of joinedRemotes) {
          if (manager.hasPeer(remoteUserId)) continue;
          if (!isOffererFor(remoteUserId)) continue; // the other side offers us
          try {
            const sdpOffer = await manager.createOffer(remoteUserId);
            await conn.invoke("SendCallOffer", callLogId, remoteUserId, sdpOffer);
            void flushOutgoingIce(remoteUserId);
          } catch (offerErr) {
            console.error("[Call] proactive offer failed:", offerErr);
          }
        }
      }

      void flushOutgoingIce();
    } catch (err) {
      console.error("[Call] AnswerCall failed:", err);
      cleanup();
    }
  }, [
    attachStreamToVideo,
    connectionRef,
    cleanup,
    activateCall,
    flushOutgoingIce,
    isOffererFor,
    localVideoRef,
    processPendingOffers,
    syncParticipantsFromCall,
    _currentUserId,
    updateState,
  ]);
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
    const { callLogId, isGroup } = stateRef.current;
    if (!conn || !callLogId) return;
    try {
      // Server ghi lại cuộc gọi thành message thật và phát qua ReceiveMessage,
      // nên không cần tự tạo message giả ở đây nữa.
      await conn.invoke(isGroup ? "LeaveCall" : "EndCall", callLogId);
    } catch (err) {
      console.error("[Call] EndCall failed:", err);
    } finally {
      cleanup();
    }
  }, [connectionRef, cleanup]);

  const notifyCurrentCallClosed = useCallback(async () => {
    const conn = connectionRef.current;
    const { callLogId, isGroup, status } = stateRef.current;
    if (!conn || !callLogId || status === "idle" || status === "ended") return;

    try {
      await conn.invoke(isGroup ? "LeaveCall" : "EndCall", callLogId);
    } catch (err) {
      console.warn("[Call] best-effort close failed:", err);
    }
  }, [connectionRef]);

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
      const remoteMember = payload.participants.find(
        (p) => p.userId != _currentUserId,
      );
      if (remoteMember) updateState({ remoteUserId: remoteMember.userId });
      callInitiatedResolveRef.current?.(payload.id);
      callInitiatedResolveRef.current = null;
      callInitiatedRejectRef.current = null;
      void flushOutgoingIce();
    };

    const onGroupCallStarted = (payload: GroupCallStartedPayload) => {
      groupCallStartedResolveRef.current?.(payload);
      groupCallStartedResolveRef.current = null;
      groupCallStartedRejectRef.current = null;
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
      createManager();
      isInitiatorRef.current = false;

      updateState({
        status: "incoming",
        callLogId: payload.callLogId,
        callType: payload.callType,
        remoteUserId: payload.callerId,
        chatroomId: payload.chatroomId,
        isGroup: false,
        participants: [
          {
            userId: _currentUserId,
            isLocal: true,
            status: "invited",
            stream: null,
          },
          {
            userId: payload.callerId,
            isLocal: false,
            status: "joined",
            stream: null,
          },
        ],
        _pendingSdpOffer: payload.sdpOffer,
      });
    };

    const onIncomingGroupCall = async (payload: IncomingGroupCallPayload) => {
      if (stateRef.current.status !== "idle") {
        try {
          await conn.invoke("RejectCall", payload.call.id);
        } catch {}
        return;
      }

      createManager();
      isInitiatorRef.current = false;

      updateState({
        status: "incoming",
        callLogId: payload.call.id,
        callType: payload.callType,
        remoteUserId: payload.callerId,
        chatroomId: payload.chatroomId,
        isGroup: true,
        participants: syncParticipantsFromCall(payload.call),
      });
    };

    // ✅ FIX: đọc payload.call.id thay vì payload.callLogId
    const onCallAnswered = async (payload: CallAnsweredPayload) => {
      const callLogId = payload.call?.id;
      if (!callLogId || stateRef.current.callLogId !== callLogId) return;

      const manager = managerRef.current;
      if (!manager) return;
      try {
        await manager.handleAnswer(payload.answeredBy, payload.sdpAnswer);
        updateState({
          participants: syncParticipantsFromCall(
            payload.call,
            manager.getLocalStream(),
          ),
        });
        updateState({ remoteUserId: payload.answeredBy });
        void flushOutgoingIce();
        activateCall(payload.call?.answeredAt); // ✅ Caller active ngay
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

    // Server đã ghi lại cuộc gọi thành message thật (phát qua "ReceiveMessage"),
    // nên ở đây chỉ cần dọn dẹp trạng thái/PeerConnection phía client.
    const onCallEnded = (payload: CallEndedPayload) => {
      const callLogId = payload.call?.id;
      if (!callLogId || stateRef.current.callLogId !== callLogId) return;
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
        await manager.addIceCandidate(payload.fromUserId, payload.candidateJson);
      } catch (err) {
        console.error("[Call] addIceCandidate failed:", err);
      }
    };

    const onCallOffer = async (payload: CallOfferPayload) => {
      if (stateRef.current.callLogId !== payload.callLogId) return;
      if (stateRef.current.status === "incoming") {
        pendingOffersRef.current.set(payload.fromUserId, payload.sdpOffer);
        return;
      }

      try {
        await processOffer(payload.fromUserId, payload.sdpOffer);
      } catch (err) {
        console.error("[Call] handle CallOffer failed:", err);
      }
    };

    const onCallAnswer = async (payload: CallAnswerPayload) => {
      if (stateRef.current.callLogId !== payload.callLogId) return;
      try {
        await managerRef.current?.handleAnswer(
          payload.fromUserId,
          payload.sdpAnswer,
        );
        void flushOutgoingIce(payload.fromUserId);
        if (stateRef.current.status === "calling") activateCall();
      } catch (err) {
        console.error("[Call] handle CallAnswer failed:", err);
      }
    };

    const onCallParticipantJoined = async (
      payload: CallParticipantChangedPayload,
    ) => {
      const joinedBy = payload.joinedBy;
      if (!joinedBy || joinedBy === _currentUserId) return;
      if (stateRef.current.callLogId !== payload.call.id) return;

      // Keep the timer aligned with the server's shared answeredAt.
      applyTimerBase(payload.call.answeredAt);

      updateState({
        participants: syncParticipantsFromCall(
          payload.call,
          managerRef.current?.getLocalStream(),
        ),
      });

      // As soon as the first participant joins, the caller is no longer just
      // "ringing" — flip to active regardless of who ends up sending the offer.
      if (stateRef.current.status === "calling") {
        activateCall(payload.call.answeredAt);
      }

      const manager = managerRef.current;
      if (!manager || manager.hasPeer(joinedBy)) return;
      if (stateRef.current.status !== "active" && stateRef.current.status !== "calling")
        return;
      // Deterministic negotiation: only offer if we are the designated offerer
      // for this pair; otherwise the joining peer will offer us.
      if (!isOffererFor(joinedBy)) return;

      try {
        const sdpOffer = await manager.createOffer(joinedBy);
        await conn.invoke("SendCallOffer", payload.call.id, joinedBy, sdpOffer);
        void flushOutgoingIce(joinedBy);
      } catch (err) {
        console.error("[Call] send offer to joined participant failed:", err);
      }
    };

    const onCallParticipantLeft = (payload: CallParticipantChangedPayload) => {
      const leftBy = payload.leftBy;
      if (!leftBy || stateRef.current.callLogId !== payload.call.id) return;
      managerRef.current?.removePeer(leftBy);
      updateState({
        participants: syncParticipantsFromCall(
          payload.call,
          managerRef.current?.getLocalStream(),
        ),
      });
    };

    const onIceRestartRequested = async (payload: IceRestartRequestedPayload) => {
      if (stateRef.current.callLogId !== payload.callLogId) return;
      const manager = managerRef.current;
      if (!manager) return;

      try {
        const sdpOffer = await manager.createOffer(payload.fromUserId, true);
        await conn.invoke(
          "SendCallOffer",
          payload.callLogId,
          payload.fromUserId,
          sdpOffer,
        );
      } catch (err) {
        console.error("[Call] ICE restart offer failed:", err);
      }
    };

    conn.on("callInitiated", onCallInitiated);
    conn.on("groupCallStarted", onGroupCallStarted);
    conn.on("incomingCall", onIncomingCall);
    conn.on("incomingGroupCall", onIncomingGroupCall);
    conn.on("callAnswered", onCallAnswered);
    conn.on("callRejected", onCallRejected);
    conn.on("callEnded", onCallEnded);
    conn.on("callFailed", onCallFailed);
    conn.on("iceCandidate", onIceCandidate);
    conn.on("callOffer", onCallOffer);
    conn.on("callAnswer", onCallAnswer);
    conn.on("callParticipantJoined", onCallParticipantJoined);
    conn.on("callParticipantLeft", onCallParticipantLeft);
    conn.on("iceRestartRequested", onIceRestartRequested);

    return () => {
      // Cleanup
      conn.off("callInitiated", onCallInitiated);
      conn.off("groupCallStarted", onGroupCallStarted);
      conn.off("incomingCall", onIncomingCall);
      conn.off("incomingGroupCall", onIncomingGroupCall);
      conn.off("callAnswered", onCallAnswered);
      conn.off("callRejected", onCallRejected);
      conn.off("callEnded", onCallEnded);
      conn.off("callFailed", onCallFailed);
      conn.off("iceCandidate", onIceCandidate);
      conn.off("callOffer", onCallOffer);
      conn.off("callAnswer", onCallAnswer);
      conn.off("callParticipantJoined", onCallParticipantJoined);
      conn.off("callParticipantLeft", onCallParticipantLeft);
      conn.off("iceRestartRequested", onIceRestartRequested);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isConnected, // ← trigger chính: chờ connection sẵn sàng
    activateCall, // ← giữ lại để tránh stale closure
    applyTimerBase,
    cleanup,
    createManager,
    flushOutgoingIce,
    isOffererFor,
    processOffer,
    syncParticipantsFromCall,
    _currentUserId,
    updateState,
  ]);

  useEffect(() => {
    if (!isConnected || syncChatroomIds.length === 0) return;
    void syncActiveCallState();
  }, [isConnected, syncActiveCallState, syncChatroomIds.length]);

  useEffect(() => {
    if (callState.status !== "calling" && callState.status !== "active") return;
    const manager = managerRef.current;
    if (!manager) return;

    attachStreamToVideo(localVideoRef.current, manager.getLocalStream());
    const firstRemote = callState.participants.find(
      (participant) => !participant.isLocal && participant.stream,
    );
    attachStreamToVideo(remoteVideoRef.current, firstRemote?.stream ?? null);
  }, [
    attachStreamToVideo,
    callState.participants,
    callState.status,
    localVideoRef,
    remoteVideoRef,
  ]);

  useEffect(() => {
    const handlePageHide = () => {
      void notifyCurrentCallClosed();
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      void notifyCurrentCallClosed().finally(cleanup);
    };
  }, [cleanup, notifyCurrentCallClosed]);

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
