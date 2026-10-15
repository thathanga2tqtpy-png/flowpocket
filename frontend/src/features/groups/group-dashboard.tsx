"use client";

import React, { useState, useEffect } from "react";
import {
  GroupItem,
  GroupDetail,
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
import { ConfirmSettlementModal } from "./confirm-settlement-modal";

import { GroupHeroCard } from "./components/group-hero-card";
import { GroupExpenseList } from "./components/group-expense-list";
import { GroupDebtSection } from "./components/group-debt-section";
import { GroupFundSection } from "./components/group-fund-section";
import { GroupMemberList } from "./components/group-member-list";

import {
  Users,
  UserPlus,
  Link2,
  Shield,
  Crown,
  Receipt,
  Wallet,
  ArrowLeftRight,
  AlertCircle,
  CheckCircle2,
  RotateCw,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";

import { useGroupManagement } from "./hooks/use-group-management";
import { groupService } from "./group-service";

interface GroupDashboardProps {
  currentUserId?: string;
}

export function GroupDashboard({ currentUserId }: GroupDashboardProps) {
  const {
    groups,
    selectedGroupId,
    setSelectedGroupId,
    selectedGroup,
    groupDetail,
    activeTab,
    setActiveTab,
    expenses,
    fund,
    fundTransactions,
    debtsOverview,
    settlements,
    loading,
    detailLoading,
    error,
    actionMessage,
    isRefreshing,
    showNotification,
    refreshData,
    handleManualRefresh,
    fetchGroups,
    fetchGroupFinancialData,
    canManageMembers,
    canDisbandGroup,
    expDatePreset,
    setExpDatePreset,
    expFromDate,
    expToDate,
    expPaymentSource,
    expPaidByUserId,
    expStatus,
    setExpFromDate,
    setExpToDate,
    setExpPaymentSource,
    setExpPaidByUserId,
    setExpStatus,
    handleExpPresetChange,
    resetExpFilters,
  } = useGroupManagement(currentUserId);

  // Modals state
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [initialJoinToken, setInitialJoinToken] = useState<string>("");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [settlementToConfirm, setSettlementToConfirm] =
    useState<GroupSettlement | null>(null);

  // Settlement prefill
  const [settlementPrefill, setSettlementPrefill] = useState<{
    toUserId?: string;
    amount?: number;
  }>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      let token = "";
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get("join_token");
      if (urlToken) {
        token = urlToken;
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      } else {
        const stored = localStorage.getItem("pending_join_token");
        if (stored) {
          token = stored;
        }
      }

      if (token) {
        localStorage.removeItem("pending_join_token");
        setInitialJoinToken(token);
        setIsJoinModalOpen(true);
      }
    }
  }, []);

  // Actions
  const handleVoidExpense = async (expense: GroupExpense) => {
    if (!selectedGroupId) return;
    const reason = window.prompt(
      `Vui lòng nhập lý do hủy khoản chi "${expense.title}":`,
    );
    if (!reason || !reason.trim()) return;

    const res = await groupService.voidExpense(
      selectedGroupId,
      expense.id,
      reason.trim(),
    );

    if (res.error) {
      alert(`Lỗi: ${res.error}`);
    } else {
      showNotification("Đã vô hiệu hóa khoản chi thành công!");
      refreshData();
    }
  };

  const handleConfirmSettlement = (s: GroupSettlement) => {
    setSettlementToConfirm(s);
    setIsConfirmModalOpen(true);
  };

  const handleRejectSettlement = async (s: GroupSettlement) => {
    if (!selectedGroupId) return;
    if (!window.confirm(`Bạn muốn từ chối khoản quyết toán này?`)) return;

    const res = await groupService.rejectSettlement(selectedGroupId, s.id);

    if (res.error) {
      alert(`Lỗi: ${res.error}`);
    } else {
      showNotification("Đã từ chối khoản quyết toán.");
      refreshData();
    }
  };

  const handleCancelSettlement = async (s: GroupSettlement) => {
    if (!selectedGroupId) return;
    if (!window.confirm(`Bạn có chắc muốn hủy yêu cầu quyết toán này?`)) return;

    const res = await groupService.cancelSettlement(selectedGroupId, s.id);

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

  const roleBadge = (role: GroupRole) => {
    switch (role) {
      case "OWNER":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <Crown className="h-3 w-3 text-slate-500" />
            Trưởng nhóm
          </span>
        );
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <Shield className="h-3 w-3 text-slate-500" />
            Quản trị viên
          </span>
        );
      case "MEMBER":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
            Thành viên
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header - Chỉ hiển thị khi đang xem danh sách tất cả các nhóm */}
      {!selectedGroupId && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Users className="h-5 w-5 text-sky-600" />
              Nhóm chi tiêu
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {groups.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chia tiền chi phí chung và quyết toán công nợ minh bạch
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2 sm:px-3 sm:py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 shrink-0"
              title="Làm mới toàn bộ dữ liệu"
            >
              <RotateCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-sky-600" : "text-slate-600"}`}
              />
              <span className="hidden sm:inline">
                {isRefreshing ? "Đang tải..." : "Làm mới"}
              </span>
            </button>
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="flex-1 sm:flex-none px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
            >
              <Link2 className="h-3.5 w-3.5 text-slate-500" />
              Tham gia bằng mã
            </button>
            <button
              onClick={() => setIsGroupModalOpen(true)}
              className="flex-1 sm:flex-none px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center justify-center gap-1.5"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Tạo nhóm mới
            </button>
          </div>
        </div>
      )}

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
        <div className="text-center py-10 text-xs text-slate-400">
          Đang tải danh sách nhóm...
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3 shadow-sm">
          <div className="h-12 w-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mx-auto text-xl">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            Bạn chưa tham gia nhóm chi tiêu nào
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Tạo nhóm mới hoặc tham gia bằng mã lời mời để bắt đầu chia tiền và
            theo dõi chi phí chung.
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
      ) : !selectedGroupId ? (
        /* MASTER VIEW: Danh sách nhóm dạng Grid thẻ thoáng đãng */
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {groups.map((group) => (
              <div
                key={group.id}
                onClick={() => setSelectedGroupId(group.id)}
                className="bg-white border border-slate-200/90 rounded-xl p-4 hover:border-sky-400 hover:shadow-xs transition cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-sky-50 text-sky-600 font-bold flex items-center justify-center shrink-0 border border-sky-100 text-sm">
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 text-sm truncate group-hover:text-sky-600 transition-colors">
                        {group.name}
                      </h4>
                      {group.current_user_role && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-medium shrink-0">
                          {group.current_user_role === "OWNER"
                            ? "Trưởng nhóm"
                            : group.current_user_role === "ADMIN"
                              ? "Quản trị viên"
                              : "Thành viên"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {group.description || `${group.member_count} thành viên`}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* DETAIL VIEW: Chi tiết nhóm Full-width 100% */
        <div className="w-full">
          {detailLoading || !groupDetail ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400">
              Đang tải dữ liệu tài chính nhóm...
            </div>
          ) : (
            <div className="space-y-4">
              {/* 1. TOP APP BAR */}
              <div className="flex items-center justify-between bg-white px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={() => setSelectedGroupId(null)}
                    className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition shrink-0"
                    title="Quay lại danh sách nhóm"
                  >
                    <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 truncate">
                        {groupDetail.group?.name || groupDetail.name}
                      </h3>
                      {(groupDetail.group?.current_user_role ||
                        groupDetail.current_user_role) &&
                        roleBadge(
                          groupDetail.group?.current_user_role ||
                            groupDetail.current_user_role!,
                        )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {groupDetail.members.length} thành viên •{" "}
                      {groupDetail.group?.currency || "VND"}
                      {(groupDetail.group?.description ||
                        groupDetail.description) && (
                        <span>
                          {" "}
                          •{" "}
                          {groupDetail.group?.description ||
                            groupDetail.description}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                    title="Làm mới dữ liệu nhóm"
                  >
                    <RotateCw
                      className={`h-4 w-4 ${isRefreshing ? "animate-spin text-sky-600" : "text-slate-600"}`}
                    />
                  </button>
                  <button
                    onClick={() => setActiveTab("members")}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                    title="Quản lý thành viên nhóm"
                  >
                    <Users className="h-4 w-4 text-slate-600" />
                  </button>
                </div>
              </div>

              {/* 2. HERO BALANCE CARD (FINTECH STYLE - COMPONENT BÓC TÁCH) */}
              <GroupHeroCard
                debtsOverview={debtsOverview}
                expenses={expenses}
                fund={fund}
                currentUserId={currentUserId}
                onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
                onNavigateToDebts={() => setActiveTab("debts")}
              />

              {/* 3. TABS NAVIGATION */}
              <div className="flex items-center gap-2 border-b border-slate-200/80 text-xs overflow-x-auto">
                <button
                  onClick={() => setActiveTab("expenses")}
                  className={`pb-2.5 pt-1 px-3 font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === "expenses"
                      ? "border-sky-600 text-sky-700"
                      : "border-transparent text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <Receipt className="h-3.5 w-3.5" />
                  Khoản chi ({expenses.length})
                </button>

                <button
                  onClick={() => setActiveTab("debts")}
                  className={`pb-2.5 pt-1 px-3 font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === "debts"
                      ? "border-sky-600 text-sky-700"
                      : "border-transparent text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  Bù trừ nợ
                </button>

                <button
                  onClick={() => setActiveTab("fund")}
                  className={`pb-2.5 pt-1 px-3 font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === "fund"
                      ? "border-sky-600 text-sky-700"
                      : "border-transparent text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <Wallet className="h-3.5 w-3.5" />
                  Quỹ chung
                </button>

                <button
                  onClick={() => setActiveTab("members")}
                  className={`pb-2.5 pt-1 px-3 font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === "members"
                      ? "border-sky-600 text-sky-700"
                      : "border-transparent text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  Thành viên ({groupDetail.members.length})
                </button>
              </div>

              {/* TAB 1: EXPENSES */}
              {activeTab === "expenses" && (
                <GroupExpenseList
                  expenses={expenses}
                  groupDetail={groupDetail}
                  currentUserId={currentUserId}
                  onVoidExpense={handleVoidExpense}
                  expDatePreset={expDatePreset}
                  setExpDatePreset={setExpDatePreset}
                  expFromDate={expFromDate}
                  setExpFromDate={setExpFromDate}
                  expToDate={expToDate}
                  setExpToDate={setExpToDate}
                  expPaymentSource={expPaymentSource}
                  setExpPaymentSource={setExpPaymentSource}
                  expPaidByUserId={expPaidByUserId}
                  setExpPaidByUserId={setExpPaidByUserId}
                  expStatus={expStatus}
                  setExpStatus={setExpStatus}
                  onPresetChange={handleExpPresetChange}
                  onResetFilters={resetExpFilters}
                />
              )}

              {/* TAB 2: DEBTS & SETTLEMENTS */}
              {activeTab === "debts" && debtsOverview && (
                <GroupDebtSection
                  debtsOverview={debtsOverview}
                  settlements={settlements}
                  groupDetail={groupDetail}
                  currentUserId={currentUserId}
                  onConfirmSettlement={handleConfirmSettlement}
                  onRejectSettlement={handleRejectSettlement}
                  onCancelSettlement={handleCancelSettlement}
                  onOpenSettlementFor={handleOpenSettlementFor}
                  onOpenGeneralSettlement={() => {
                    setSettlementPrefill({});
                    setIsSettlementModalOpen(true);
                  }}
                  onShowNotification={showNotification}
                />
              )}

              {/* TAB 3: GROUP FUND */}
              {activeTab === "fund" && (
                <GroupFundSection
                  fund={fund}
                  fundTransactions={fundTransactions}
                  onOpenFundModal={() => setIsFundModalOpen(true)}
                />
              )}

              {/* TAB 4: MEMBERS */}
              {activeTab === "members" && (
                <GroupMemberList
                  groupDetail={groupDetail}
                  currentUserId={currentUserId}
                  canManageMembers={canManageMembers}
                  onOpenInviteModal={() => setIsInviteModalOpen(true)}
                  onRefresh={() => {
                    if (selectedGroupId) {
                      fetchGroupFinancialData(selectedGroupId);
                    }
                    fetchGroups();
                  }}
                />
              )}
            </div>
          )}
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
          onMemberAdded={() => {
            fetchGroupFinancialData(selectedGroup.id);
            fetchGroups();
          }}
        />
      )}

      <JoinModal
        isOpen={isJoinModalOpen}
        initialToken={initialJoinToken}
        onClose={() => {
          setIsJoinModalOpen(false);
          setInitialJoinToken("");
        }}
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
              showNotification("Đã thêm khoản chi tiêu mới!");
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
              showNotification("Giao dịch quỹ thành công!");
              refreshData();
            }}
          />

          <SettlementModal
            isOpen={isSettlementModalOpen}
            groupId={selectedGroup.id}
            members={groupDetail.members}
            currentUserId={currentUserId}
            currentUserNet={debtsOverview?.current_user_net}
            defaultToUserId={settlementPrefill.toUserId}
            defaultAmount={settlementPrefill.amount}
            onClose={() => {
              setIsSettlementModalOpen(false);
              setSettlementPrefill({});
            }}
            onSuccess={() => {
              showNotification("Đã gửi yêu cầu quyết toán!");
              refreshData();
            }}
          />

          <ConfirmSettlementModal
            isOpen={isConfirmModalOpen}
            groupId={selectedGroup.id}
            settlement={settlementToConfirm}
            onClose={() => {
              setIsConfirmModalOpen(false);
              setSettlementToConfirm(null);
            }}
            onSuccess={() => {
              showNotification("Đã xác nhận nhận tiền thành công!");
              refreshData();
            }}
          />
        </>
      )}
    </div>
  );
}
