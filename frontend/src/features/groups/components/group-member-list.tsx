"use client";

import React, { useState } from "react";
import { GroupDetail, GroupMemberItem, GroupRole } from "../types";
import { groupService } from "../group-service";
import {
  Users,
  Crown,
  Shield,
  Trash2,
  MoreVertical,
  AlertTriangle,
  UserCheck,
  X,
  ShieldAlert,
} from "lucide-react";

interface GroupMemberListProps {
  groupDetail: GroupDetail;
  currentUserId?: string;
  canManageMembers: boolean;
  onOpenInviteModal: () => void;
  onRefresh?: () => void;
}

export function GroupMemberList({
  groupDetail,
  currentUserId,
  canManageMembers,
  onOpenInviteModal,
  onRefresh,
}: GroupMemberListProps) {
  // Member to remove state
  const [memberToRemove, setMemberToRemove] = useState<GroupMemberItem | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Role change state
  const [memberToChangeRole, setMemberToChangeRole] = useState<{
    member: GroupMemberItem;
    targetRole: GroupRole;
  } | null>(null);
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  // Active dropdown menu for a member
  const [activeMenuMemberId, setActiveMenuMemberId] = useState<string | null>(null);

  // Identify current user's role
  const currentMember = groupDetail.members.find(
    (m) => m.user_id === currentUserId
  );
  const currentUserRole: GroupRole = currentMember?.role || "MEMBER";
  const isCurrentOwner = currentUserRole === "OWNER";
  const isCurrentAdmin = currentUserRole === "ADMIN";

  const getMemberDisplayName = (m: GroupMemberItem) => {
    return (
      m.user_full_name ||
      m.display_name ||
      m.user_email ||
      m.email ||
      "Thành viên"
    );
  };

  const getMemberEmail = (m: GroupMemberItem) => {
    return m.user_email || m.email || "";
  };

  // Determine if current user can remove target member
  const canRemoveMember = (target: GroupMemberItem): boolean => {
    if (target.user_id === currentUserId) return false; // Cannot remove self
    if (isCurrentOwner) return true; // Owner can remove anyone except self
    if (isCurrentAdmin && target.role === "MEMBER") return true; // Admin can remove regular members
    return false;
  };

  // Determine if current user can change target member's role
  const canChangeRole = (target: GroupMemberItem): boolean => {
    if (!isCurrentOwner) return false; // Only Owner can change member roles
    if (target.user_id === currentUserId) return false;
    return true;
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    setIsRemoving(true);
    setRemoveError(null);

    const res = await groupService.removeMember(
      groupDetail.id,
      memberToRemove.user_id
    );

    setIsRemoving(false);
    if (res.error) {
      setRemoveError(res.error);
    } else {
      setMemberToRemove(null);
      onRefresh?.();
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!memberToChangeRole) return;
    setIsChangingRole(true);
    setRoleError(null);

    const res = await groupService.updateMemberRole(
      groupDetail.id,
      memberToChangeRole.member.user_id,
      memberToChangeRole.targetRole
    );

    setIsChangingRole(false);
    if (res.error) {
      setRoleError(res.error);
    } else {
      setMemberToChangeRole(null);
      setActiveMenuMemberId(null);
      onRefresh?.();
    }
  };

  const roleBadge = (role: GroupRole) => {
    switch (role) {
      case "OWNER":
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <Crown className="h-3 w-3 text-amber-500" /> Trưởng nhóm
          </span>
        );
      case "ADMIN":
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
            <Shield className="h-3 w-3 text-sky-500" /> Quản trị
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
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-sky-600" />
          Danh sách thành viên ({groupDetail.members.length})
        </h4>
        {canManageMembers && (
          <button
            onClick={onOpenInviteModal}
            className="text-xs text-sky-600 hover:text-sky-700 hover:underline font-semibold flex items-center gap-1"
          >
            <span>+ Mời / Thêm</span>
          </button>
        )}
      </div>

      {/* Member list */}
      <div className="divide-y divide-slate-100">
        {groupDetail.members.map((member) => {
          const isMe = member.user_id === currentUserId;
          const removable = canRemoveMember(member);
          const changeable = canChangeRole(member);
          const name = getMemberDisplayName(member);
          const email = getMemberEmail(member);

          return (
            <div
              key={member.id}
              className="py-3 flex justify-between items-center text-xs group transition hover:bg-slate-50/50 -mx-2 px-2 rounded-lg"
            >
              {/* Member Info */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-sky-700 shrink-0">
                  {name[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                    <span className="truncate">{name}</span>
                    {isMe && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded font-normal shrink-0">
                        Bạn
                      </span>
                    )}
                  </div>
                  {email && (
                    <div className="text-[11px] text-slate-400 truncate">
                      {email}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions & Role Badge */}
              <div className="flex items-center gap-2 shrink-0">
                {roleBadge(member.role)}

                {/* More actions dropdown for Owner / Admin */}
                {(removable || changeable) && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveMenuMemberId(
                          activeMenuMemberId === member.id ? null : member.id
                        )
                      }
                      title="Tùy chọn thành viên"
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {activeMenuMemberId === member.id && (
                      <div className="absolute right-0 top-full mt-1 z-30 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                        {/* Role Change actions (Owner only) */}
                        {changeable && (
                          <>
                            {member.role !== "ADMIN" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuMemberId(null);
                                  setMemberToChangeRole({
                                    member,
                                    targetRole: "ADMIN",
                                  });
                                }}
                                className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Shield className="h-3.5 w-3.5 text-sky-600" />
                                <span>Thăng cấp Quản trị viên</span>
                              </button>
                            )}

                            {member.role !== "MEMBER" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuMemberId(null);
                                  setMemberToChangeRole({
                                    member,
                                    targetRole: "MEMBER",
                                  });
                                }}
                                className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <UserCheck className="h-3.5 w-3.5 text-slate-500" />
                                <span>Đặt làm Thành viên</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuMemberId(null);
                                setMemberToChangeRole({
                                  member,
                                  targetRole: "OWNER",
                                });
                              }}
                              className="w-full text-left px-3 py-2 text-amber-700 hover:bg-amber-50 flex items-center gap-2 border-b border-slate-100"
                            >
                              <Crown className="h-3.5 w-3.5 text-amber-500" />
                              <span>Chuyển quyền Trưởng nhóm</span>
                            </button>
                          </>
                        )}

                        {/* Remove Action */}
                        {removable && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuMemberId(null);
                              setMemberToRemove(member);
                            }}
                            className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Xóa khỏi nhóm</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: CONFIRM REMOVE MEMBER */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-5 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <AlertTriangle className="h-5 w-5" />
                <span>Xóa thành viên khỏi nhóm</span>
              </div>
              <button
                onClick={() => setMemberToRemove(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {removeError && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
                {removeError}
              </div>
            )}

            <div className="space-y-3 py-1">
              <p className="text-xs text-slate-600 leading-relaxed">
                Bạn có chắc chắn muốn xóa thành viên{" "}
                <span className="font-bold text-slate-900">
                  {getMemberDisplayName(memberToRemove)}
                </span>{" "}
                ra khỏi nhóm <span className="font-semibold text-slate-800">{groupDetail.name}</span> không?
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 space-y-1">
                <p>• Thành viên này sẽ không thể truy cập vào nhóm nữa.</p>
                <p>• Lịch sử chi tiêu và công nợ trước đây vẫn được giữ nguyên để đối soát.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                disabled={isRemoving}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={isRemoving}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm shadow-rose-600/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isRemoving ? "Đang xóa..." : "Xác nhận xóa"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM ROLE CHANGE OR TRANSFER OWNERSHIP */}
      {memberToChangeRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-5 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                {memberToChangeRole.targetRole === "OWNER" ? (
                  <>
                    <Crown className="h-5 w-5 text-amber-500" />
                    <span>Chuyển quyền Trưởng nhóm</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-5 w-5 text-sky-600" />
                    <span>Thay đổi vai trò thành viên</span>
                  </>
                )}
              </div>
              <button
                onClick={() => setMemberToChangeRole(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {roleError && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
                {roleError}
              </div>
            )}

            <div className="space-y-3 py-1 text-xs text-slate-600 leading-relaxed">
              {memberToChangeRole.targetRole === "OWNER" ? (
                <>
                  <p>
                    Bạn sắp chuyển giao quyền <b>Trưởng nhóm (Owner)</b> cho{" "}
                    <span className="font-bold text-slate-900">
                      {getMemberDisplayName(memberToChangeRole.member)}
                    </span>
                    .
                  </p>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                    Sau khi chuyển giao, bạn sẽ trở thành <b>Quản trị viên (Admin)</b>. Chỉ Trưởng nhóm mới có quyền giải tán nhóm hoặc chuyển nhượng lại.
                  </div>
                </>
              ) : (
                <p>
                  Xác nhận đổi vai trò của{" "}
                  <span className="font-bold text-slate-900">
                    {getMemberDisplayName(memberToChangeRole.member)}
                  </span>{" "}
                  thành <b>{memberToChangeRole.targetRole === "ADMIN" ? "Quản trị viên (ADMIN)" : "Thành viên (MEMBER)"}</b>?
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMemberToChangeRole(null)}
                disabled={isChangingRole}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleChange}
                disabled={isChangingRole}
                className={`px-4 py-2 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm ${
                  memberToChangeRole.targetRole === "OWNER"
                    ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/20"
                    : "bg-sky-600 hover:bg-sky-500 shadow-sky-600/20"
                }`}
              >
                <span>{isChangingRole ? "Đang xử lý..." : "Xác nhận"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
