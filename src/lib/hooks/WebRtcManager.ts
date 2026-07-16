/**
 * WebRtcManager
 * Pure class – không phụ thuộc React.
 * Quản lý RTCPeerConnection, media stream, SDP và ICE cho cuộc gọi 1-1.
 *
 * Đặt file tại: src/lib/hooks/WebRtcManager.ts
 */

const DEFAULT_STUN_URLS = [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
  "stun:stun2.l.google.com:19302",
];

/**
 * ICE servers are read from env so a real TURN server can be plugged in
 * without a code change. Without TURN, calls only work when both peers can
 * reach each other with STUN alone (typically same network/NAT) — this is
 * the most common reason two peers on different networks connect but never
 * see each other's media.
 */
export function buildIceServers(): RTCIceServer[] {
  const stunUrls = (process.env.NEXT_PUBLIC_STUN_URLS?.trim() || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  const servers: RTCIceServer[] = [
    { urls: stunUrls.length > 0 ? stunUrls : DEFAULT_STUN_URLS },
  ];

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL?.trim();
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME?.trim();
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL?.trim();

  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
  } else if (typeof window !== "undefined") {
    console.warn(
      "[WebRTC] No NEXT_PUBLIC_TURN_URL configured — calls between peers on " +
        "different networks/NATs may connect but show no audio/video because " +
        "STUN alone cannot relay media through symmetric NATs or restrictive " +
        "firewalls.",
    );
  }

  return servers;
}

export type OnIceCandidateFn = (candidateJson: string) => void;
export type OnRemoteTrackFn = (stream: MediaStream) => void;
export type OnConnectionStateFn = (state: RTCPeerConnectionState) => void;

export class WebRtcManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

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

    // Thử lần 1: video + audio với constraint cụ thể.
    // facingMode dùng { ideal } (không phải giá trị "exact" trần) vì nhiều
    // webcam laptop/PC không khai báo facingMode — nếu coi đây là bắt buộc,
    // getUserMedia sẽ ném OverconstrainedError trên desktop trong khi máy
    // di động (luôn có facingMode "user"/"environment") vẫn xin quyền bình
    // thường, đúng như triệu chứng "desktop không ra hình, mobile ra hình".
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: { ideal: "user" },
        },
      });
      this.logStreamTracks("getUserMedia(constraint)");
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
      this.logStreamTracks("getUserMedia(video:true)");
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
    this.logStreamTracks("getUserMedia(audio only fallback)");
    return this.localStream;
  }

  private logStreamTracks(context: string): void {
    const tracks = this.localStream?.getTracks() ?? [];
    console.info(
      `[WebRTC] ${context} → tracks: ${tracks
        .map((t) => `${t.kind}(enabled=${t.enabled},readyState=${t.readyState})`)
        .join(", ") || "none"}`,
    );
  }

  getCurrentLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
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
    this.pc = new RTCPeerConnection({ iceServers: buildIceServers() });

    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.onIceCandidate(JSON.stringify(candidate.toJSON()));
    };

    this.pc.ontrack = ({ streams, track }) => {
      console.info(
        `[WebRTC] ontrack: kind=${track.kind} readyState=${track.readyState} streamTracks=${streams[0]?.getTracks().length ?? 0}`,
      );

      if (streams[0]) {
        this.remoteStream = streams[0];
      } else {
        if (!this.remoteStream) this.remoteStream = new MediaStream();
        this.remoteStream.addTrack(track);
      }

      if (this.remoteStream) this.onRemoteTrack(this.remoteStream);
    };

    this.pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      console.info(`[WebRTC] connectionState=${this.pc.connectionState}`);
      this.onConnectionState(this.pc.connectionState);
    };

    this.pc.oniceconnectionstatechange = () => {
      if (this.pc) console.info(`[WebRTC] iceConnectionState=${this.pc.iceConnectionState}`);
    };

    // Gắn local tracks vào peer connection — log rõ track camera/mic có
    // thật sự được thêm vào PC hay không (nguyên nhân phổ biến khiến bên
    // kia không thấy hình: track bị "ended"/"muted" ngay từ máy gửi).
    const localTracks = this.localStream?.getTracks() ?? [];
    if (localTracks.length === 0) {
      console.warn("[WebRTC] createPeerConnection: no local tracks to attach.");
    }
    localTracks.forEach((track) => {
      console.info(
        `[WebRTC] addTrack: kind=${track.kind} enabled=${track.enabled} readyState=${track.readyState}`,
      );
      this.pc!.addTrack(track, this.localStream!);
    });

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
    this.remoteStream = null;
    this.pc?.close();
    this.pc = null;
  }
}
