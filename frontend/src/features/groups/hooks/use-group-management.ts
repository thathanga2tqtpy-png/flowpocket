"use client";

import { useState, useCallback, useEffect } from "react";
import { groupService } from "../group-service";
import {
  GroupItem,
  GroupDetail,
  GroupExpense,
  GroupFund,
  GroupFundTransaction,
  GroupDebtOverview,
  GroupSettlement,
} from "../types";

export type ExpDatePreset =
  | "ALL"
  | "TODAY"
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "CUSTOM";

export function useGroupManagement(currentUserId?: string) {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null);
  const [activeTab, setActiveTab] = useState<
    "expenses" | "fund" | "debts" | "members"
  >("expenses");

  // Financial Data States
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [fund, setFund] = useState<GroupFund | null>(null);
  const [fundTransactions, setFundTransactions] = useState<
    GroupFundTransaction[]
  >([]);
  const [debtsOverview, setDebtsOverview] =
    useState<GroupDebtOverview | null>(null);
  const [settlements, setSettlements] = useState<GroupSettlement[]>([]);

  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Expense Filter State
  const [expDatePreset, setExpDatePreset] = useState<ExpDatePreset>("ALL");
  const [expFromDate, setExpFromDate] = useState<string>("");
  const [expToDate, setExpToDate] = useState<string>("");
  const [expPaymentSource, setExpPaymentSource] = useState<string>("");
  const [expPaidByUserId, setExpPaidByUserId] = useState<string>("");
  const [expStatus, setExpStatus] = useState<string>("");

  const showNotification = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  const handleExpPresetChange = (preset: ExpDatePreset) => {
    setExpDatePreset(preset);
    const now = new Date();

    if (preset === "ALL") {
      setExpFromDate("");
      setExpToDate("");
    } else if (preset === "TODAY") {
      const todayStr = now.toISOString().split("T")[0];
      setExpFromDate(todayStr);
      setExpToDate(todayStr);
    } else if (preset === "THIS_WEEK") {
      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diffToMonday));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setExpFromDate(monday.toISOString().split("T")[0]);
      setExpToDate(sunday.toISOString().split("T")[0]);
    } else if (preset === "THIS_MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setExpFromDate(firstDay.toISOString().split("T")[0]);
      setExpToDate(lastDay.toISOString().split("T")[0]);
    }
  };

  const resetExpFilters = () => {
    setExpDatePreset("ALL");
    setExpFromDate("");
    setExpToDate("");
    setExpPaymentSource("");
    setExpPaidByUserId("");
    setExpStatus("");
  };

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await groupService.getGroups();
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      setGroups(res.data);
      if (res.data.length > 0) {
        setSelectedGroupId((prev) => {
          if (!prev) return null;
          const exists = res.data?.some((g) => g.id === prev);
          return exists ? prev : null;
        });
      } else {
        setSelectedGroupId(null);
        setGroupDetail(null);
      }
    }
  }, []);

  const fetchGroupFinancialData = useCallback(async (id: string) => {
    setDetailLoading(true);
    const [detailRes, expRes, fundRes, fundTxRes, debtsRes, setRes] =
      await Promise.all([
        groupService.getGroupDetail(id),
        groupService.getExpenses(id),
        groupService.getFund(id),
        groupService.getFundTransactions(id),
        groupService.getDebts(id),
        groupService.getSettlements(id),
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

  const fetchGroupExpenses = useCallback(
    async (id: string) => {
      const params = new URLSearchParams();
      params.append("limit", "100");
      if (expFromDate) params.append("from_date", expFromDate);
      if (expToDate) params.append("to_date", expToDate);
      if (expPaymentSource) params.append("payment_source", expPaymentSource);
      if (expPaidByUserId) params.append("paid_by_user_id", expPaidByUserId);
      if (expStatus) params.append("status", expStatus);

      const expRes = await groupService.getExpenses(id, params);
      if (expRes.data) setExpenses(expRes.data);
    },
    [expFromDate, expToDate, expPaymentSource, expPaidByUserId, expStatus]
  );

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupFinancialData(selectedGroupId);
    }
  }, [selectedGroupId, fetchGroupFinancialData]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupExpenses(selectedGroupId);
    }
  }, [selectedGroupId, fetchGroupExpenses]);

  const refreshData = () => {
    if (selectedGroupId) {
      fetchGroupFinancialData(selectedGroupId);
      fetchGroupExpenses(selectedGroupId);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchGroups(),
      selectedGroupId ? fetchGroupFinancialData(selectedGroupId) : Promise.resolve(),
      selectedGroupId ? fetchGroupExpenses(selectedGroupId) : Promise.resolve(),
    ]);
    setTimeout(() => {
      setIsRefreshing(false);
      showNotification("Dữ liệu tài chính đã được làm mới!");
    }, 400);
  };

  const selectedGroup =
    groups.find((g) => g.id === selectedGroupId) || groups[0] || null;

  const currentRole = groupDetail?.current_user_role || "MEMBER";
  const canManageMembers = currentRole === "OWNER" || currentRole === "ADMIN";
  const canDisbandGroup = currentRole === "OWNER";

  return {
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
    fetchGroupExpenses,
    canManageMembers,
    canDisbandGroup,
    // Filters
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
  };
}

