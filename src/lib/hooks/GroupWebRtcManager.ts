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
}

export class GroupWebRtcManager {
  private localStream: MediaStream | null = null;
  private readonly peers = new Map<string, PeerState>();

  constructor(private readonly options: GroupWebRtcManagerOptions) {}

  async initLocalStream(callType: CallType): Promise<MediaStream> {
    if (this.localStream) return this.localStream;

    if (callType !== "video") {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
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
    const offer = await peer.pc.createOffer({ iceRestart });
    await peer.pc.setLocalDescription(offer);
    return offer.sdp ?? "";
  }

  async handleOffer(userId: string, sdpOffer: string): Promise<string> {
    const peer = this.ensurePeer(userId);
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
    const peer = this.ensurePeer(userId);
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
  }

  destroy(): void {
    this.peers.forEach((peer) => peer.pc.close());
    this.peers.clear();
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
  }

  private ensurePeer(userId: string): PeerState {
    const existing = this.peers.get(userId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
    const remoteStream = new MediaStream();
    const peer: PeerState = { pc, remoteStream, pendingCandidates: [] };

    this.localStream?.getTracks().forEach((track) => {
      pc.addTrack(track, this.localStream!);
    });

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

    this.peers.set(userId, peer);
    return peer;
  }

  private async flushPendingCandidates(peer: PeerState): Promise<void> {
    const candidates = peer.pendingCandidates.splice(0);
    for (const candidateJson of candidates) {
      await peer.pc.addIceCandidate(
        new RTCIceCandidate(JSON.parse(candidateJson)),
      );
    }
  }
}
