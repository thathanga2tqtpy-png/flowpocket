"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/api-client";
import {
  GroupItem,
  GroupDetail,
  GroupMemberItem,
  GroupRole,
  GroupExpense,
  GroupFund,
  GroupFundTransaction,
  GroupDebtOverview,
  GroupSettlement,
  DebtSimplificationItem,
} from "./types";
import { GroupModal } from "./group-modal";
import { InviteModal } from "./invite-modal";
import { JoinModal } from "./join-modal";
import { ExpenseModal } from "./expense-modal";
import { FundModal } from "./fund-modal";
import { SettlementModal } from "./settlement-modal";
import {
  Users,
  UserPlus,
  Link2,
  Shield,
  Crown,
  LogOut,
  Receipt,
  Wallet,
  ArrowLeftRight,
  Plus,
  Ban,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Info
} from "lucide-react";

interface GroupDashboardProps {
  currentUserId?: string;
}

export function GroupDashboard({ currentUserId }: GroupDashboardProps) {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null);
  const [activeTab, setActiveTab] = useState<"expenses" | "fund" | "debts" | "members">("expenses");

  // Phase 5 Financial Data States
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [fund, setFund] = useState<GroupFund | null>(null);
  const [fundTransactions, setFundTransactions] = useState<GroupFundTransaction[]>([]);
  const [debtsOverview, setDebtsOverview] = useState<GroupDebtOverview | null>(null);
  const [settlements, setSettlements] = useState<GroupSettlement[]>([]);

  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Modals state
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);

  // Settlement prefill
  const [settlementPrefill, setSettlementPrefill] = useState<{
    toUserId?: string;
    amount?: number;
  }>({});

  const showNotification = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

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

  const fetchGroupFinancialData = useCallback(async (id: string) => {
    setDetailLoading(true);
    const [detailRes, expRes, fundRes, fundTxRes, debtsRes, setRes] = await Promise.all([
      apiRequest<GroupDetail>(`/api/v1/groups/${id}`),
      apiRequest<GroupExpense[]>(`/api/v1/groups/${id}/expenses`),
      apiRequest<GroupFund>(`/api/v1/groups/${id}/fund`),
      apiRequest<GroupFundTransaction[]>(`/api/v1/groups/${id}/fund/transactions`),
      apiRequest<GroupDebtOverview>(`/api/v1/groups/${id}/debts`),
      apiRequest<GroupSettlement[]>(`/api/v1/groups/${id}/settlements`),
    ]);
    setDetailLoading(false);

    if (detailRes.data) {
      const raw: any = detailRes.data;
      const normalizedGroup: GroupItem = raw.group || {
        id: raw.id,
        name: raw.name,
        description: raw.description,
        currency: raw.currency || "VND",
        created_by_user_id: raw.created_by_user_id,
        is_active: raw.status === "ACTIVE",
        created_at: raw.created_at,
        updated_at: raw.updated_at || raw.created_at,
        current_user_role: raw.current_user_role || "MEMBER",
        member_count: raw.member_count || raw.members?.length || 1,
      };

      setGroupDetail({
        ...normalizedGroup,
        group: normalizedGroup,
        members: raw.members || [],
      });
    }
    if (expRes.data) setExpenses(expRes.data);
    if (fundRes.data) setFund(fundRes.data);
    if (fundTxRes.data) setFundTransactions(fundTxRes.data);
    if (debtsRes.data) setDebtsOverview(debtsRes.data);
    if (setRes.data) setSettlements(setRes.data);
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupFinancialData(selectedGroupId);
    }
  }, [selectedGroupId, fetchGroupFinancialData]);

  const refreshData = () => {
    if (selectedGroupId) {
      fetchGroupFinancialData(selectedGroupId);
    }
  };

  // Actions
  const handleVoidExpense = async (expense: GroupExpense) => {
    const reason = window.prompt(`Vui lòng nhập lý do hủy khoản chi "${expense.title}":`);
    if (!reason || !reason.trim()) return;

    const res = await apiRequest(`/api/v1/groups/${selectedGroupId}/expenses/${expense.id}/void`, {
      method: "POST",
      body: JSON.stringify({ reason: reason.trim() }),
    });

    if (res.error) {
      alert(`Lỗi: ${res.error}`);
    } else {
      showNotification("Đã vô hiệu hóa khoản chi thành công!");
      refreshData();
    }
  };

  const handleConfirmSettlement = async (s: GroupSettlement) => {
    if (!window.confirm(`Xác nhận đã nhận được ${s.amount.toLocaleString("vi-VN")} đ từ ${s.from_user_name}?`)) return;

    const res = await apiRequest(`/api/v1/groups/${selectedGroupId}/settlements/${s.id}/confirm`, {
      method: "POST",
    });

    if (res.error) {
      alert(`Lỗi: ${res.error}`);
    } else {
      showNotification("Đã xác nhận thanh toán quyết toán thành công!");
      refreshData();
    }
  };

  const handleRejectSettlement = async (s: GroupSettlement) => {
    if (!window.confirm(`Bạn muốn từ chối khoản quyết toán này?`)) return;

    const res = await apiRequest(`/api/v1/groups/${selectedGroupId}/settlements/${s.id}/reject`, {
      method: "POST",
    });

    if (res.error) {
      alert(`Lỗi: ${res.error}`);
    } else {
      showNotification("Đã từ chối khoản quyết toán.");
      refreshData();
    }
  };

  const handleCancelSettlement = async (s: GroupSettlement) => {
    if (!window.confirm(`Bạn có chắc muốn hủy yêu cầu quyết toán này?`)) return;

    const res = await apiRequest(`/api/v1/groups/${selectedGroupId}/settlements/${s.id}/cancel`, {
      method: "POST",
    });

    if (res.error) {
      alert(`Lỗi: ${res.error}`);
    } else {
      showNotification("Đã hủy yêu cầu quyết toán.");
      refreshData();
    }
  };

  const handleOpenSettlementFor = (item: DebtSimplificationItem) => {
    setSettlementPrefill({
      toUserId: item.to_user_id,
      amount: item.amount,
    });
    setIsSettlementModalOpen(true);
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Users className="h-5 w-5 text-sky-600" />
            Nhóm chi tiêu & Quỹ chung
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý chi phí nhóm, chia tiền thông minh và quyết toán công nợ minh bạch.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
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

      {/* Main View */}
      {loading ? (
        <div className="text-center py-10 text-xs text-slate-400">Đang tải danh sách nhóm...</div>
      ) : groups.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3 shadow-sm">
          <div className="h-12 w-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mx-auto text-xl">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Bạn chưa tham gia nhóm chi tiêu nào</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Tạo nhóm mới hoặc tham gia bằng mã lời mời để bắt đầu chia tiền và theo dõi chi phí chung.
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
          {/* Groups Sidebar (4 cols) */}
          <div className="md:col-span-4 space-y-2">
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

          {/* Group Financial Details (8 cols) */}
          <div className="md:col-span-8">
            {detailLoading || !groupDetail ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400">
                Đang tải dữ liệu tài chính nhóm...
              </div>
            ) : (
              <div className="space-y-4">
                {/* Group Summary Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-800">
                          {groupDetail.group?.name || groupDetail.name}
                        </h3>
                        {(groupDetail.group?.current_user_role || groupDetail.current_user_role) &&
                          roleBadge(groupDetail.group?.current_user_role || groupDetail.current_user_role!)}
                      </div>
                      {(groupDetail.group?.description || groupDetail.description) && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {groupDetail.group?.description || groupDetail.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsExpenseModalOpen(true)}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-sm"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Khoản chi mới
                      </button>
                    </div>
                  </div>

                  {/* Sub-Tabs: Expenses, Fund, Debts, Members */}
                  <div className="flex border-b border-slate-100 gap-2 sm:gap-4 overflow-x-auto text-xs">
                    <button
                      onClick={() => setActiveTab("expenses")}
                      className={`pb-2 font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                        activeTab === "expenses"
                          ? "border-sky-600 text-sky-700"
                          : "border-transparent text-slate-400 hover:text-slate-700"
                      }`}
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      Chi phí ({expenses.length})
                    </button>

                    <button
                      onClick={() => setActiveTab("debts")}
                      className={`pb-2 font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                        activeTab === "debts"
                          ? "border-sky-600 text-sky-700"
                          : "border-transparent text-slate-400 hover:text-slate-700"
                      }`}
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      Công nợ & Quyết toán
                    </button>

                    <button
                      onClick={() => setActiveTab("fund")}
                      className={`pb-2 font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                        activeTab === "fund"
                          ? "border-sky-600 text-sky-700"
                          : "border-transparent text-slate-400 hover:text-slate-700"
                      }`}
                    >
                      <Wallet className="h-3.5 w-3.5" />
                      Quỹ chung ({fund ? `${fund.balance.toLocaleString("vi-VN")} đ` : "0 đ"})
                    </button>

                    <button
                      onClick={() => setActiveTab("members")}
                      className={`pb-2 font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                        activeTab === "members"
                          ? "border-sky-600 text-sky-700"
                          : "border-transparent text-slate-400 hover:text-slate-700"
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" />
                      Thành viên ({groupDetail.members.length})
                    </button>
                  </div>
                </div>

                {/* TAB 1: EXPENSES */}
                {activeTab === "expenses" && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Receipt className="h-3.5 w-3.5 text-sky-600" />
                        Danh sách khoản chi tiêu nhóm
                      </h4>
                      <button
                        onClick={() => setIsExpenseModalOpen(true)}
                        className="text-xs text-sky-600 hover:underline font-semibold"
                      >
                        + Thêm khoản chi
                      </button>
                    </div>

                    {expenses.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400 space-y-2">
                        <Receipt className="h-8 w-8 mx-auto text-slate-300" />
                        <p>Chưa có khoản chi nào trong nhóm này.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {expenses.map((exp) => {
                          const isVoid = exp.status === "VOID";
                          return (
                            <div
                              key={exp.id}
                              className={`py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 ${
                                isVoid ? "opacity-50" : ""
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className={`font-bold text-sm ${isVoid ? "line-through text-slate-400" : "text-slate-800"}`}>
                                    {exp.title}
                                  </span>
                                  {isVoid ? (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
                                      Đã hủy
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                                      {exp.payment_source === "FUND" ? "Quỹ chung trả" : `Người trả: ${exp.paid_by_name || "Thành viên"}`}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                  <span>{new Date(exp.expense_date).toLocaleDateString("vi-VN")}</span>
                                  <span>•</span>
                                  <span>{exp.splits.length} người chia ({exp.split_method === "EQUAL" ? "Chia đều" : "Tùy chọn"})</span>
                                  {isVoid && exp.void_reason && (
                                    <span className="text-rose-500 italic">({exp.void_reason})</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                <span className={`text-sm font-bold ${isVoid ? "text-slate-400 line-through" : "text-slate-900"}`}>
                                  {exp.total_amount.toLocaleString("vi-VN")} đ
                                </span>

                                {!isVoid && (
                                  <button
                                    onClick={() => handleVoidExpense(exp)}
                                    title="Hủy khoản chi này"
                                    className="p-1 text-slate-400 hover:text-rose-600 transition"
                                  >
                                    <Ban className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: DEBTS & SETTLEMENTS */}
                {activeTab === "debts" && debtsOverview && (
                  <div className="space-y-4">
                    {/* User Net Balance Card */}
                    <div
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm ${
                        debtsOverview.current_user_net > 0
                          ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                          : debtsOverview.current_user_net < 0
                          ? "bg-rose-50/70 border-rose-200 text-rose-900"
                          : "bg-sky-50/70 border-sky-200 text-sky-900"
                      }`}
                    >
                      <div>
                        <span className="text-[11px] uppercase tracking-wider font-bold block opacity-75">
                          Số dư công nợ của bạn trong nhóm
                        </span>
                        <div className="text-xl font-bold mt-0.5">
                          {debtsOverview.current_user_net > 0
                            ? `Bạn được nhận lại +${debtsOverview.current_user_net.toLocaleString("vi-VN")} đ`
                            : debtsOverview.current_user_net < 0
                            ? `Bạn còn cần trả ${debtsOverview.current_user_net.toLocaleString("vi-VN")} đ`
                            : "Công nợ của bạn đã cân bằng (0 đ)"}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSettlementPrefill({});
                          setIsSettlementModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5 text-sky-600" />
                        Tạo quyết toán trả tiền
                      </button>
                    </div>

                    {/* Suggested Minimal Settlements */}
                    {debtsOverview.suggested_settlements.length > 0 && (
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <ArrowLeftRight className="h-3.5 w-3.5 text-sky-600" />
                          Gợi ý thanh toán tối thiểu (Tối ưu để tất cả về 0)
                        </h4>

                        <div className="space-y-2">
                          {debtsOverview.suggested_settlements.map((item, idx) => {
                            const isMeDebtor = item.from_user_id === currentUserId;
                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`font-semibold ${isMeDebtor ? "text-rose-600" : "text-slate-700"}`}>
                                    {item.from_user_name}
                                  </span>
                                  <span className="text-slate-400">cần trả cho</span>
                                  <span className="font-semibold text-emerald-700">
                                    {item.to_user_name}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">
                                    {item.amount.toLocaleString("vi-VN")} đ
                                  </span>
                                  {isMeDebtor && (
                                    <button
                                      onClick={() => handleOpenSettlementFor(item)}
                                      className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[11px] font-semibold transition"
                                    >
                                      Trả tiền
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Pending & Completed Settlements List */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-sky-600" />
                        Giao dịch quyết toán ({settlements.length})
                      </h4>

                      {settlements.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400">
                          Chưa có giao dịch quyết toán nào.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {settlements.map((s) => {
                            const isReceiver = s.to_user_id === currentUserId;
                            const isSender = s.from_user_id === currentUserId;
                            const isPending = s.status === "PENDING";

                            return (
                              <div key={s.id} className="py-2.5 flex justify-between items-center gap-2 text-xs">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-800">{s.from_user_name}</span>
                                    <span className="text-slate-400">→</span>
                                    <span className="font-semibold text-slate-800">{s.to_user_name}</span>
                                    <span
                                      className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                        s.status === "CONFIRMED"
                                          ? "bg-emerald-100 text-emerald-800"
                                          : s.status === "PENDING"
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-slate-100 text-slate-500"
                                      }`}
                                    >
                                      {s.status === "CONFIRMED"
                                        ? "Đã xác nhận"
                                        : s.status === "PENDING"
                                        ? "Chờ xác nhận"
                                        : s.status === "REJECTED"
                                        ? "Đã từ chối"
                                        : "Đã hủy"}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {new Date(s.created_at).toLocaleDateString("vi-VN")}
                                    {s.note && ` • ${s.note}`}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">
                                    {s.amount.toLocaleString("vi-VN")} đ
                                  </span>

                                  {/* Recipient confirm/reject actions */}
                                  {isPending && isReceiver && (
                                    <div className="flex gap-1 pl-1">
                                      <button
                                        onClick={() => handleConfirmSettlement(s)}
                                        className="p-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded"
                                        title="Xác nhận đã nhận tiền"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleRejectSettlement(s)}
                                        className="p-1 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded"
                                        title="Từ chối"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  )}

                                  {/* Sender cancel action */}
                                  {isPending && isSender && (
                                    <button
                                      onClick={() => handleCancelSettlement(s)}
                                      className="text-[11px] text-slate-400 hover:text-rose-600 pl-1"
                                    >
                                      Hủy
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Member Balances Table */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                        Bảng cân đối công nợ từng thành viên
                      </h4>

                      <div className="divide-y divide-slate-100 text-xs">
                        {debtsOverview.members_balances.map((mb) => (
                          <div key={mb.user_id} className="py-2 flex justify-between items-center">
                            <div>
                              <div className="font-semibold text-slate-800">
                                {mb.full_name || mb.email}
                                {mb.user_id === currentUserId && (
                                  <span className="text-[10px] ml-1.5 px-1 bg-slate-100 text-slate-500 rounded">
                                    Bạn
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                Đã trả: {mb.total_paid.toLocaleString("vi-VN")} đ | Chịu: {mb.total_share.toLocaleString("vi-VN")} đ
                              </div>
                            </div>

                            <span
                              className={`font-bold ${
                                mb.net_balance > 0
                                  ? "text-emerald-700"
                                  : mb.net_balance < 0
                                  ? "text-rose-600"
                                  : "text-slate-500"
                              }`}
                            >
                              {mb.net_balance > 0 ? `+${mb.net_balance.toLocaleString("vi-VN")} đ` : `${mb.net_balance.toLocaleString("vi-VN")} đ`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: GROUP FUND */}
                {activeTab === "fund" && (
                  <div className="space-y-4">
                    {/* Fund Header Card */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Số dư quỹ chung hiện tại
                        </span>
                        <div className="text-2xl font-bold text-sky-700 mt-1">
                          {fund ? fund.balance.toLocaleString("vi-VN") : 0} đ
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Quỹ dùng để chi tiêu các khoản chung mà không cần phân bổ nợ cá nhân cho từng thành viên.
                        </p>
                      </div>

                      <button
                        onClick={() => setIsFundModalOpen(true)}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold transition shadow-sm flex items-center gap-1.5"
                      >
                        <Wallet className="h-4 w-4" />
                        Đóng góp / Rút quỹ
                      </button>
                    </div>

                    {/* Fund Transactions History */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Wallet className="h-3.5 w-3.5 text-sky-600" />
                        Lịch sử dòng tiền quỹ ({fundTransactions.length})
                      </h4>

                      {fundTransactions.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400">
                          Chưa có giao dịch quỹ nào được ghi nhận.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 text-xs">
                          {fundTransactions.map((tx) => {
                            const isPositive = tx.transaction_type === "CONTRIBUTION" || tx.transaction_type === "ADJUSTMENT_IN";
                            return (
                              <div key={tx.id} className="py-2.5 flex justify-between items-center">
                                <div>
                                  <div className="font-semibold text-slate-800">
                                    {tx.description || (isPositive ? "Đóng góp quỹ" : "Chi tiêu từ quỹ")}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {new Date(tx.transaction_date).toLocaleDateString("vi-VN")}
                                    {tx.contributor_name && ` • Đóng góp bởi ${tx.contributor_name}`}
                                  </div>
                                </div>

                                <span
                                  className={`font-bold ${
                                    isPositive ? "text-emerald-700" : "text-rose-600"
                                  }`}
                                >
                                  {isPositive ? `+${tx.amount.toLocaleString("vi-VN")} đ` : `-${tx.amount.toLocaleString("vi-VN")} đ`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: MEMBERS (Phase 4) */}
                {activeTab === "members" && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-sky-600" />
                        Danh sách thành viên ({groupDetail.members.length})
                      </h4>
                      {canManageMembers && (
                        <button
                          onClick={() => setIsInviteModalOpen(true)}
                          className="text-xs text-sky-600 hover:underline font-semibold"
                        >
                          + Mời thêm
                        </button>
                      )}
                    </div>

                    <div className="divide-y divide-slate-100">
                      {groupDetail.members.map((member) => (
                        <div key={member.id} className="py-2.5 flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-sky-700">
                              {(member.user_full_name || member.display_name || member.user_email || "U")[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800">
                                {member.user_full_name || member.display_name || member.user_email}
                                {member.user_id === currentUserId && (
                                  <span className="text-[10px] ml-1.5 px-1 bg-slate-100 text-slate-500 rounded">
                                    Bạn
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">{member.user_email || member.email}</div>
                            </div>
                          </div>

                          {roleBadge(member.role)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

      {selectedGroup && groupDetail && (
        <>
          <ExpenseModal
            isOpen={isExpenseModalOpen}
            groupId={selectedGroup.id}
            members={groupDetail.members}
            fund={fund}
            currentUserId={currentUserId}
            onClose={() => setIsExpenseModalOpen(false)}
            onSuccess={() => {
              showNotification("Tạo khoản chi tiêu nhóm thành công!");
              refreshData();
            }}
          />

          <FundModal
            isOpen={isFundModalOpen}
            groupId={selectedGroup.id}
            fund={fund}
            canManageFund={canManageMembers}
            onClose={() => setIsFundModalOpen(false)}
            onSuccess={() => {
              showNotification("Cập nhật quỹ chung thành công!");
              refreshData();
            }}
          />

          <SettlementModal
            isOpen={isSettlementModalOpen}
            groupId={selectedGroup.id}
            members={groupDetail.members}
            currentUserId={currentUserId}
            defaultToUserId={settlementPrefill.toUserId}
            defaultAmount={settlementPrefill.amount}
            onClose={() => setIsSettlementModalOpen(false)}
            onSuccess={() => {
              showNotification("Đã gửi yêu cầu quyết toán chuyển trả tiền!");
              refreshData();
            }}
          />
        </>
      )}
    </div>
  );
}
