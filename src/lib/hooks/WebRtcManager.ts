/**
 * WebRtcManager
 * Pure class – không phụ thuộc React.
 * Quản lý RTCPeerConnection, media stream, SDP và ICE cho cuộc gọi 1-1.
 *
 * Đặt file tại: src/lib/hooks/WebRtcManager.ts
 */

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  {
    urls: "turn:your-turn-server.com:3478",
    username: "user",
    credential: "pass",
  },
];

export type OnIceCandidateFn = (candidateJson: string) => void;
export type OnRemoteTrackFn = (stream: MediaStream) => void;
export type OnConnectionStateFn = (state: RTCPeerConnectionState) => void;

export class WebRtcManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;

  constructor(
    private readonly onIceCandidate: OnIceCandidateFn,
    private readonly onRemoteTrack: OnRemoteTrackFn,
    private readonly onConnectionState: OnConnectionStateFn,
  ) {}

  // ── Media ─────────────────────────────────────────────────────────────────

  async getLocalStream(callType: "audio" | "video"): Promise<MediaStream> {
    if (callType !== "video") {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      return this.localStream;
    }

    // Thử lần 1: video + audio với constraint cụ thể
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
      });
      return this.localStream;
    } catch (err1) {
      console.warn(
        "[WebRTC] getUserMedia với constraint thất bại, thử fallback:",
        err1,
      );
    }

    // Thử lần 2: video boolean đơn giản nhất
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      return this.localStream;
    } catch (err2) {
      console.warn(
        "[WebRTC] getUserMedia video=true thất bại, thử chỉ audio:",
        err2,
      );
    }

    // Thử lần 3: audio only — vẫn cho phép gọi tiếp, chỉ mất video
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    return this.localStream;
  }

  getLocalStreamOrThrow(): MediaStream {
    if (!this.localStream) throw new Error("Local stream chưa được khởi tạo.");
    return this.localStream;
  }

  setMicEnabled(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = enabled));
  }

  setCamEnabled(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = enabled));
  }

  addTrack(track: MediaStreamTrack, stream: MediaStream): void {
    if (!this.pc) throw new Error("PeerConnection chưa được tạo");
    this.pc.addTrack(track, stream);
  }

  private pendingCandidates: string[] = [];
  // ── PeerConnection ────────────────────────────────────────────────────────

  createPeerConnection(): RTCPeerConnection {
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.onIceCandidate(JSON.stringify(candidate.toJSON()));
    };

    this.pc.ontrack = ({ streams }) => {
      if (streams[0]) this.onRemoteTrack(streams[0]);
    };

    this.pc.onconnectionstatechange = () => {
      if (this.pc) this.onConnectionState(this.pc.connectionState);
    };

    // Gắn local tracks vào peer connection
    this.localStream
      ?.getTracks()
      .forEach((track) => this.pc!.addTrack(track, this.localStream!));

    return this.pc;
  }

  // ── SDP ───────────────────────────────────────────────────────────────────

  /** Caller: tạo offer, set local description, trả về SDP string */
  async createOffer(): Promise<string> {
    if (!this.pc) throw new Error("PeerConnection chưa được tạo.");
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer.sdp!;
  }

  /** Callee: nhận offer → tạo answer → set cả hai, trả về SDP answer string */
  async handleOffer(sdpOffer: string): Promise<string> {
    if (!this.pc) throw new Error("PeerConnection chưa được tạo.");

    await this.pc.setRemoteDescription({ type: "offer", sdp: sdpOffer });
    for (const c of this.pendingCandidates)
      await this.pc.addIceCandidate(new RTCIceCandidate(JSON.parse(c)));
    this.pendingCandidates = [];

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer.sdp!;
  }

  /** Caller: nhận answer từ callee */
  async handleAnswer(sdpAnswer: string): Promise<void> {
    if (!this.pc) throw new Error("PeerConnection chưa được tạo.");
    await this.pc.setRemoteDescription({ type: "answer", sdp: sdpAnswer });
    for (const c of this.pendingCandidates)
      await this.pc.addIceCandidate(new RTCIceCandidate(JSON.parse(c)));
    this.pendingCandidates = [];
  }

  /** Cả hai: nhận ICE candidate từ đối phương */
  async addIceCandidate(candidateJson: string): Promise<void> {
    if (!this.pc) return;
    if (!this.pc.remoteDescription) {
      this.pendingCandidates.push(candidateJson);
      return;
    }
    await this.pc.addIceCandidate(
      new RTCIceCandidate(JSON.parse(candidateJson)),
    );
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  destroy() {
    this.pendingCandidates = [];
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.pc?.close();
    this.pc = null;
  }
}
