"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Loader2, ShieldBan, UsersRound } from "lucide-react";
import { blockedUsersApi } from "@/lib/api/blocked-users";
import {
  groupInvitationsApi,
  type GroupInvitationResponse,
} from "@/lib/api/group-invitations";

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "#"
  );
}

function InvitationAvatar({ src, name }: { src?: string | null; name: string }) {
  if (src) {
    return <img src={src} alt={name} className="h-12 w-12 rounded-full object-cover" />;
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold text-white">
      {initials(name)}
    </div>
  );
}

export default function GroupInvitationsView() {
  const [invitations, setInvitations] = useState<GroupInvitationResponse[]>([]);
  const [selectedInvitationId, setSelectedInvitationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const selectedInvitation = useMemo(
    () => invitations.find((item) => item.invitationId === selectedInvitationId) ?? null,
    [invitations, selectedInvitationId],
  );

  const load = async () => {
    setLoading(true);
    try {
      const data = await groupInvitationsApi.getReceived();
      setInvitations(data);
      setSelectedInvitationId((current) => {
        if (current && data.some((item) => item.invitationId === current)) return current;
        return data[0]?.invitationId ?? null;
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const accept = async (invitationId: string) => {
    setBusyId(invitationId);
    try {
      await groupInvitationsApi.accept(invitationId);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (invitationId: string) => {
    setBusyId(invitationId);
    try {
      await groupInvitationsApi.reject(invitationId);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const blockInviter = async (invitation: GroupInvitationResponse) => {
    setBusyId(invitation.invitationId);
    try {
      await blockedUsersApi.blockUser(invitation.invitedBy, "Blocked from group invitation");
      await groupInvitationsApi.reject(invitation.invitationId).catch(() => undefined);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <div>
          <div className="mx-auto mb-5 flex h-32 w-32 items-center justify-center rounded-full bg-slate-100">
            <ClipboardList size={58} className="text-slate-700" />
          </div>
          <p className="font-semibold">Không có lời mời vào nhóm nào</p>
          <p className="mt-2 text-sm text-slate-400">
            Khi nào bạn nhận được lời mời, lời mời sẽ hiển thị ở đây.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {selectedInvitation && (
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <InvitationAvatar
                src={selectedInvitation.chatroomAvatar}
                name={selectedInvitation.chatroomName}
              />
              <div>
                <p className="flex items-center gap-2 text-lg font-semibold">
                  <UsersRound size={18} className="text-slate-400" />
                  {selectedInvitation.chatroomName || "Nhóm chưa đặt tên"}
                </p>
                <p className="text-sm text-slate-400">
                  {selectedInvitation.memberCount} thành viên ? Mời bởi {selectedInvitation.invitedByFullname || selectedInvitation.invitedByUsername}
                </p>
                <p className="mt-4 max-w-2xl rounded border border-slate-200 px-3 py-3 text-sm text-slate-700">
                  {selectedInvitation.message || "Bạn được mời tham gia nhóm này."}
                </p>
              </div>
            </div>

            <div className="grid min-w-[360px] grid-cols-3 gap-2">
              <button
                type="button"
                disabled={busyId === selectedInvitation.invitationId}
                onClick={() => blockInviter(selectedInvitation)}
                className="flex h-10 items-center justify-center gap-2 rounded-md bg-red-50 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
              >
                <ShieldBan size={16} /> Chặn
              </button>
              <button
                type="button"
                disabled={busyId === selectedInvitation.invitationId}
                onClick={() => reject(selectedInvitation.invitationId)}
                className="h-10 rounded-md bg-slate-100 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
              >
                Từ chối
              </button>
              <button
                type="button"
                disabled={busyId === selectedInvitation.invitationId}
                onClick={() => accept(selectedInvitation.invitationId)}
                className="h-10 rounded-md bg-blue-700 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
              >
                Chấp nhận
              </button>
            </div>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-sm font-semibold">
          Lời mời vào nhóm ({invitations.length})
        </h2>
        <div className="grid gap-3 xl:grid-cols-3 lg:grid-cols-2">
          {invitations.map((invitation) => {
            const selected = invitation.invitationId === selectedInvitationId;

            return (
              <button
                key={invitation.invitationId}
                type="button"
                onClick={() => setSelectedInvitationId(invitation.invitationId)}
                className={`rounded-md p-4 text-left transition ${
                  selected ? "bg-emerald-50 ring-1 ring-emerald-200" : "border border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <InvitationAvatar
                    src={invitation.chatroomAvatar}
                    name={invitation.chatroomName}
                  />
                  <div>
                    <p className="font-semibold">
                      {invitation.chatroomName || "Nhóm chưa đặt tên"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDate(invitation.sentAt)} - Mời bởi {invitation.invitedByFullname || invitation.invitedByUsername}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
