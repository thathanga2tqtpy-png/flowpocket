"use client";

import React from "react";
import { GroupDetail, GroupRole } from "../types";
import { Users, Crown, Shield } from "lucide-react";

interface GroupMemberListProps {
  groupDetail: GroupDetail;
  currentUserId?: string;
  canManageMembers: boolean;
  onOpenInviteModal: () => void;
}

export function GroupMemberList({
  groupDetail,
  currentUserId,
  canManageMembers,
  onOpenInviteModal,
}: GroupMemberListProps) {
  const roleBadge = (role: GroupRole) => {
    switch (role) {
      case "OWNER":
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <Crown className="h-3 w-3" /> Trưởng nhóm
          </span>
        );
      case "ADMIN":
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
            <Shield className="h-3 w-3" /> Quản trị
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
            Thành viên
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-sky-600" />
          Danh sách thành viên ({groupDetail.members.length})
        </h4>
        {canManageMembers && (
          <button
            onClick={onOpenInviteModal}
            className="text-xs text-sky-600 hover:underline font-semibold"
          >
            + Mời thêm
          </button>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {groupDetail.members.map((member) => (
          <div
            key={member.id}
            className="py-2.5 flex justify-between items-center text-xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-sky-700">
                {(
                  member.user_full_name ||
                  member.display_name ||
                  member.user_email ||
                  "U"
                )[0].toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-slate-800">
                  {member.user_full_name ||
                    member.display_name ||
                    member.user_email}
                  {member.user_id === currentUserId && (
                    <span className="text-[10px] ml-1.5 px-1 bg-slate-100 text-slate-500 rounded">
                      Bạn
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  {member.user_email || member.email}
                </div>
              </div>
            </div>

            {roleBadge(member.role)}
          </div>
        ))}
      </div>
    </div>
  );
}

