"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/api-client";
import { GroupItem, GroupDetail, GroupMemberItem, GroupRole } from "./types";
import { GroupModal } from "./group-modal";
import { InviteModal } from "./invite-modal";
import { JoinModal } from "./join-modal";
import {
  Users,
  UserPlus,
  Link2,
  Shield,
  Crown,
  LogOut,
  ShieldAlert,
  Calendar,
  Coins,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface GroupDashboardProps {
  currentUserId?: string;
}

export function GroupDashboard({ currentUserId }: GroupDashboardProps) {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Action feedback
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiRequest<GroupItem[]>("/api/v1/groups");
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      setGroups(res.data);
      if (res.data.length > 0) {
        setSelectedGroupId((prev) => {
          const exists = res.data?.some((g) => g.id === prev);
          return exists ? prev : res.data![0].id;
        });
      } else {
        setSelectedGroupId(null);
        setGroupDetail(null);
      }
    }
  }, []);

  const fetchGroupDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    const res = await apiRequest<GroupDetail>(`/api/v1/groups/${id}`);
    setDetailLoading(false);

    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      setGroupDetail(res.data);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupDetail(selectedGroupId);
    }
  }, [selectedGroupId, fetchGroupDetail]);

  const showNotification = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  const handleRoleChange = async (member: GroupMemberItem, newRole: GroupRole) => {
    if (!selectedGroupId) return;
    const confirmText =
      newRole === "OWNER"
        ? `Bạn có chắc chắn muốn chuyển giao vai trò Trưởng nhóm (OWNER) cho "${member.user_full_name || member.user_email}"? Bạn sẽ trở thành Quản trị viên.`
        : `Thay đổi vai trò của "${member.user_full_name || member.user_email}" thành ${newRole}?`;

    if (!window.confirm(confirmText)) return;

    const res = await apiRequest(
      `/api/v1/groups/${selectedGroupId}/members/${member.user_id}/role`,
      {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      }
    );

    if (res.error) {
      alert(`Lỗi: ${res.error}`);
    } else {
      showNotification("Đã cập nhật vai trò thành viên thành công!");
      fetchGroupDetail(selectedGroupId);
      fetchGroups();
    }
  };

  const handleRemoveMember = async (member: GroupMemberItem) => {
    if (!selectedGroupId) return;
    if (
      !window.confirm(
        `Xác nhận xóa thành viên "${member.user_full_name || member.user_email}" khỏi nhóm?`
      )
    ) {
      return;
    }

    const res = await apiRequest(
      `/api/v1/groups/${selectedGroupId}/members/${member.user_id}`,
      {
        method: "DELETE",
      }
    );

    if (res.error) {
      alert(`Lỗi: ${res.error}`);
    } else {
      showNotification("Đã xóa thành viên khỏi nhóm!");
      fetchGroupDetail(selectedGroupId);
      fetchGroups();
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroupId) return;
    if (!window.confirm("Bạn có chắc chắn muốn rời khỏi nhóm này?")) return;

    const res = await apiRequest(`/api/v1/groups/${selectedGroupId}/leave`, {
      method: "POST",
    });

    if (res.error) {
      alert(`Lỗi: ${res.error}`);
    } else {
      showNotification("Bạn đã rời khỏi nhóm thành công!");
      fetchGroups();
    }
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const isOwner = selectedGroup?.current_user_role === "OWNER";
  const isAdmin = selectedGroup?.current_user_role === "ADMIN";
  const canManageMembers = isOwner || isAdmin;

  const roleBadge = (role: GroupRole) => {
    switch (role) {
      case "OWNER":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Crown className="h-3 w-3 text-amber-600" />
            Trưởng nhóm
          </span>
        );
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Shield className="h-3 w-3 text-indigo-600" />
            Quản trị viên
          </span>
        );
      case "MEMBER":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Thành viên
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Users className="h-5 w-5 text-sky-600" />
            Nhóm chi tiêu chung
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý quỹ nhóm, phòng trọ, dự án chung hoặc chuyến du lịch cùng bạn bè.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="flex-1 sm:flex-none px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
          >
            <Link2 className="h-3.5 w-3.5 text-slate-600" />
            Tham gia bằng mã
          </button>
          <button
            onClick={() => setIsGroupModalOpen(true)}
            className="flex-1 sm:flex-none px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition shadow-sm flex items-center justify-center gap-1.5"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Tạo nhóm mới
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main layout */}
      {loading ? (
        <div className="text-center py-10 text-xs text-slate-400">Đang tải danh sách nhóm...</div>
      ) : groups.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3 shadow-sm">
          <div className="h-12 w-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mx-auto text-xl">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Bạn chưa tham gia nhóm chi tiêu nào</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Tạo nhóm mới để bắt đầu theo dõi chi tiêu chung, hoặc tham gia nhóm đã có bằng mã bảo mật lời mời.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <button
              onClick={() => setIsGroupModalOpen(true)}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold text-xs transition"
            >
              Tạo nhóm ngay
            </button>
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition"
            >
              Nhập mã tham gia
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Group selector sidebar (4 cols) */}
          <div className="md:col-span-5 space-y-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Nhóm của bạn ({groups.length})
              </span>
            </div>

            <div className="space-y-2">
              {groups.map((group) => {
                const isSelected = group.id === selectedGroupId;
                return (
                  <div
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`p-3.5 rounded-xl cursor-pointer border transition-all text-left ${
                      isSelected
                        ? "bg-sky-50/70 border-sky-300 shadow-sm"
                        : "bg-white border-slate-200/80 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-slate-800 text-sm">{group.name}</h4>
                      {group.current_user_role && roleBadge(group.current_user_role)}
                    </div>
                    {group.description && (
                      <p className="text-xs text-slate-500 line-clamp-1 mb-2">
                        {group.description}
                      </p>
                    )}
                    <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1.5 border-t border-slate-100">
                      <span>👥 {group.member_count} thành viên</span>
                      <span>Tiền tệ: {group.currency}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Group Detail Panel (7 cols) */}
          <div className="md:col-span-7">
            {detailLoading || !groupDetail ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400">
                Đang tải chi tiết nhóm...
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header card */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-800">
                          {groupDetail.group.name}
                        </h3>
                        {groupDetail.group.current_user_role &&
                          roleBadge(groupDetail.group.current_user_role)}
                      </div>
                      {groupDetail.group.description && (
                        <p className="text-xs text-slate-500 mt-1">
                          {groupDetail.group.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {canManageMembers && (
                        <button
                          onClick={() => setIsInviteModalOpen(true)}
                          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-sm"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Mời bạn
                        </button>
                      )}
                      <button
                        onClick={handleLeaveGroup}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Rời nhóm
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">Ngày tạo</span>
                      <span className="font-semibold text-slate-700">
                        {new Date(groupDetail.group.created_at).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">Tiền tệ</span>
                      <span className="font-semibold text-slate-700">
                        {groupDetail.group.currency}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">Thành viên</span>
                      <span className="font-semibold text-slate-700">
                        {groupDetail.members.length} người
                      </span>
                    </div>
                  </div>
                </div>

                {/* Isolation notice */}
                <div className="p-3 bg-sky-50/60 border border-sky-200 rounded-xl flex items-start gap-2.5 text-xs text-sky-900">
                  <Shield className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    <strong>Bảo mật tài chính cá nhân:</strong> Các thành viên trong nhóm chỉ thấy chi tiêu phát sinh chung của nhóm. Tất cả ví cá nhân và chi tiêu riêng của bạn được cô lập và bảo mật 100%.
                  </span>
                </div>

                {/* Members List */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-sky-600" />
                      Danh sách thành viên ({groupDetail.members.length})
                    </h4>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {groupDetail.members.map((member) => {
                      const isSelf = member.user_id === currentUserId;
                      return (
                        <div
                          key={member.id}
                          className="py-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-sky-700">
                              {(member.user_full_name || member.user_email || "U")[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-800 text-xs">
                                  {member.user_full_name || member.user_email}
                                </span>
                                {isSelf && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-medium">
                                    Bạn
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400">
                                {member.user_email}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            {roleBadge(member.role)}

                            {/* Owner controls */}
                            {isOwner && !isSelf && (
                              <div className="flex items-center gap-1.5 pl-1">
                                <select
                                  aria-label="Cập nhật quyền thành viên"
                                  value={member.role}
                                  onChange={(e) =>
                                    handleRoleChange(member, e.target.value as GroupRole)
                                  }
                                  className="text-[11px] bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-700 focus:outline-none"
                                >
                                  <option value="MEMBER">Thành viên</option>
                                  <option value="ADMIN">Quản trị viên</option>
                                  <option value="OWNER">Chuyển Trưởng nhóm</option>
                                </select>
                                <button
                                  onClick={() => handleRemoveMember(member)}
                                  title="Xóa thành viên"
                                  className="text-slate-400 hover:text-rose-600 p-1 text-xs"
                                >
                                  ✕
                                </button>
                              </div>
                            )}

                            {/* Admin controls */}
                            {isAdmin && !isOwner && !isSelf && member.role === "MEMBER" && (
                              <button
                                onClick={() => handleRemoveMember(member)}
                                title="Xóa thành viên"
                                className="text-xs text-rose-600 hover:underline pl-1"
                              >
                                Xóa
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <GroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onSuccess={() => {
          showNotification("Tạo nhóm thành công!");
          fetchGroups();
        }}
      />

      {selectedGroup && (
        <InviteModal
          isOpen={isInviteModalOpen}
          groupId={selectedGroup.id}
          groupName={selectedGroup.name}
          onClose={() => setIsInviteModalOpen(false)}
        />
      )}

      <JoinModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onSuccess={() => {
          showNotification("Tham gia nhóm thành công!");
          fetchGroups();
        }}
      />
    </div>
  );
}

