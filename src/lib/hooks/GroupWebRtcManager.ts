import { buildIceServers } from "./WebRtcManager";
import type { CallType } from "./useCallSignalR";

type PeerState = {
  pc: RTCPeerConnection;
  remoteStream: MediaStream;
  pendingCandidates: string[];
};

interface GroupWebRtcManagerOptions {
  onIceCandidate: (recipientUserId: string, candidateJson: string) => void;
  onRemoteStream: (userId: string, stream: MediaStream) => void;
  onConnectionState: (
    userId: string,
    state: RTCPeerConnectionState,
  ) => void;
  onIceConnectionFailed?: (userId: string) => void;
}

export class GroupWebRtcManager {
  private localStream: MediaStream | null = null;
  private readonly peers = new Map<string, PeerState>();
  private readonly earlyCandidates = new Map<string, string[]>();
  private readonly iceRestartRequested = new Set<string>();

  constructor(private readonly options: GroupWebRtcManagerOptions) {}

  async initLocalStream(callType: CallType): Promise<MediaStream> {
    if (this.localStream) return this.localStream;

    if (callType !== "video") {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      this.attachLocalTracksToExistingPeers();
      return this.localStream;
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: { ideal: "user" },
        },
      });
    } catch (error) {
      console.warn("[GroupWebRTC] video constraints failed, fallback:", error);
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
    }

    this.attachLocalTracksToExistingPeers();
    return this.localStream;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(userId: string): MediaStream | null {
    return this.peers.get(userId)?.remoteStream ?? null;
  }

  hasPeer(userId: string): boolean {
    return this.peers.has(userId);
  }

  setMicEnabled(enabled: boolean): void {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  setCamEnabled(enabled: boolean): void {
    this.localStream?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  async createOffer(userId: string, iceRestart = false): Promise<string> {
    const peer = this.ensurePeer(userId);
    if (iceRestart) this.iceRestartRequested.delete(userId);
    const offer = await peer.pc.createOffer({ iceRestart });
    await peer.pc.setLocalDescription(offer);
    return offer.sdp ?? "";
  }

  async handleOffer(userId: string, sdpOffer: string): Promise<string> {
    const peer = this.ensurePeer(userId);
    this.iceRestartRequested.delete(userId);
    await peer.pc.setRemoteDescription({ type: "offer", sdp: sdpOffer });
    await this.flushPendingCandidates(peer);
    const answer = await peer.pc.createAnswer();
    await peer.pc.setLocalDescription(answer);
    return answer.sdp ?? "";
  }

  async handleAnswer(userId: string, sdpAnswer: string): Promise<void> {
    const peer = this.peers.get(userId);
    if (!peer) return;
    await peer.pc.setRemoteDescription({ type: "answer", sdp: sdpAnswer });
    await this.flushPendingCandidates(peer);
  }

  async addIceCandidate(userId: string, candidateJson: string): Promise<void> {
    const peer = this.peers.get(userId);
    if (!peer) {
      const pending = this.earlyCandidates.get(userId) ?? [];
      pending.push(candidateJson);
      this.earlyCandidates.set(userId, pending);
      return;
    }

    if (!peer.pc.remoteDescription) {
      peer.pendingCandidates.push(candidateJson);
      return;
    }

    await peer.pc.addIceCandidate(
      new RTCIceCandidate(JSON.parse(candidateJson)),
    );
  }

  removePeer(userId: string): void {
    const peer = this.peers.get(userId);
    if (!peer) return;
    peer.pc.close();
    this.peers.delete(userId);
    this.earlyCandidates.delete(userId);
    this.iceRestartRequested.delete(userId);
  }

  destroy(): void {
    this.peers.forEach((peer) => peer.pc.close());
    this.peers.clear();
    this.earlyCandidates.clear();
    this.iceRestartRequested.clear();
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
  }

  private ensurePeer(userId: string): PeerState {
    const existing = this.peers.get(userId);
    if (existing) {
      this.attachLocalTracks(existing);
      return existing;
    }

    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
    const remoteStream = new MediaStream();
    const peer: PeerState = { pc, remoteStream, pendingCandidates: [] };

    this.attachLocalTracks(peer);

    const early = this.earlyCandidates.get(userId) ?? [];
    this.earlyCandidates.delete(userId);
    peer.pendingCandidates.push(...early);

    pc.onicecandidate = ({ candidate }) => {
      if (!candidate) return;
      this.options.onIceCandidate(
        userId,
        JSON.stringify(candidate.toJSON()),
      );
    };

    pc.ontrack = ({ streams, track }) => {
      const stream = streams[0] ?? remoteStream;
      if (!streams[0] && !remoteStream.getTracks().includes(track)) {
        remoteStream.addTrack(track);
      }
      this.options.onRemoteStream(userId, stream);
    };

    pc.onconnectionstatechange = () => {
      this.options.onConnectionState(userId, pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.info(`[GroupWebRTC] iceConnectionState[${userId}]=${state}`);
      if (state === "failed" && !this.iceRestartRequested.has(userId)) {
        this.iceRestartRequested.add(userId);
        this.options.onIceConnectionFailed?.(userId);
      }
      if (state === "connected" || state === "completed") {
        this.iceRestartRequested.delete(userId);
      }
    };

    this.peers.set(userId, peer);
    return peer;
  }

  private attachLocalTracks(peer: PeerState): void {
    if (!this.localStream) {
      console.warn(
        "[GroupWebRTC] ensurePeer: no local stream yet — tracks will be attached later.",
      );
      return;
    }

    const existing = new Set(
      peer.pc
        .getSenders()
        .map((sender) => sender.track?.id)
        .filter((id): id is string => Boolean(id)),
    );

    for (const track of this.localStream.getTracks()) {
      if (existing.has(track.id)) continue;
      console.info(
        `[GroupWebRTC] addTrack: kind=${track.kind} enabled=${track.enabled} readyState=${track.readyState}`,
      );
      peer.pc.addTrack(track, this.localStream);
    }
  }

  private attachLocalTracksToExistingPeers(): void {
    for (const peer of this.peers.values()) {
      this.attachLocalTracks(peer);
    }
  }

  private async flushPendingCandidates(peer: PeerState): Promise<void> {
    const candidates = peer.pendingCandidates.splice(0);
    for (const candidateJson of candidates) {
      try {
        await peer.pc.addIceCandidate(
          new RTCIceCandidate(JSON.parse(candidateJson)),
        );
      } catch (err) {
        console.warn("[GroupWebRTC] addIceCandidate failed:", err);
      }
    }
  }
}
