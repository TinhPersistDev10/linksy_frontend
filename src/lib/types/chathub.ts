import { CallType } from "./call";

export interface IncomingCallPayload {
  callLogId: string;
  callerId: string;
  chatroomId: string;
  callType: CallType;
  sdpOffer: string;
}
 
export interface CallAnsweredPayload {
  callLogId: string;
  answeredBy: string;
  sdpAnswer: string;
}
 
export interface CallRejectedPayload {
  callLogId: string;
  rejectedBy: string;
}
 
export interface CallEndedPayload {
  callLogId: string;
  endedBy: string;
  endedAt: string;
  durationSec: number | null;
}
 
export interface IceCandidatePayload {
  callLogId: string;
  fromUserId: string;
  candidateJson: string;
}
