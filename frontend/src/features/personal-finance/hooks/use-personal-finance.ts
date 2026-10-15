"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { personalFinanceService } from "../personal-finance-service";
import { qrPaymentService } from "@/features/qr-payments/qr-service";
import {
  Wallet,
  Category,
  Transaction,
  FinancialSummary,
  CategoryExpenseBreakdown,
} from "../types";
import { OutgoingPaymentRequest } from "@/features/qr-payments/types";

export type PersonalDatePreset =
  | "ALL"
  | "TODAY"
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "CUSTOM";

export function usePersonalFinance() {
  const [viewMode, setViewMode] = useState<"overview" | "reports">("overview");
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [datePreset, setDatePreset] = useState<PersonalDatePreset>("ALL");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [selectedGroupName, setSelectedGroupName] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Outgoing Pending Expenses state
  const [pendingExpenses, setPendingExpenses] = useState<OutgoingPaymentRequest[]>([]);
  const [totalPendingAmount, setTotalPendingAmount] = useState<number>(0);

  // Compute dates based on preset
  const handlePresetChange = (preset: PersonalDatePreset) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === "ALL") {
      setFromDate("");
      setToDate("");
    } else if (preset === "TODAY") {
      const todayStr = now.toISOString().split("T")[0];
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "THIS_WEEK") {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      setFromDate(monday.toISOString().split("T")[0]);
      setToDate(sunday.toISOString().split("T")[0]);
    } else if (preset === "THIS_MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFromDate(firstDay.toISOString().split("T")[0]);
      setToDate(lastDay.toISOString().split("T")[0]);
    } else if (preset === "LAST_MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      setFromDate(firstDay.toISOString().split("T")[0]);
      setToDate(lastDay.toISOString().split("T")[0]);
    }
  };

  useEffect(() => {
    personalFinanceService.getGroups().then((res) => {
      if (res.data) {
        setGroups(res.data.map((g: any) => ({ id: g.id, name: g.name })));
      }
    });
  }, []);

  const resetFilters = () => {
    setDatePreset("ALL");
    setFromDate("");
    setToDate("");
    setSelectedWalletId("");
    setSelectedType("");
    setSelectedCategoryId("");
    setSelectedSource("");
    setSelectedGroupName("");
  };

  const hasActiveFilters =
    datePreset !== "ALL" ||
    Boolean(fromDate) ||
    Boolean(toDate) ||
    Boolean(selectedWalletId) ||
    Boolean(selectedType) ||
    Boolean(selectedCategoryId) ||
    Boolean(selectedSource) ||
    Boolean(selectedGroupName);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const txParams = new URLSearchParams();
      txParams.append("limit", "100");
      if (selectedWalletId) txParams.append("wallet_id", selectedWalletId);
      if (selectedCategoryId) txParams.append("category_id", selectedCategoryId);
      if (selectedType) txParams.append("transaction_type", selectedType);
      if (selectedSource) txParams.append("source_type", selectedSource);
      if (fromDate) txParams.append("from_date", `${fromDate}T00:00:00`);
      if (toDate) txParams.append("to_date", `${toDate}T23:59:59`);

      const sumParams = new URLSearchParams();
      if (fromDate) sumParams.append("from_date", `${fromDate}T00:00:00`);
      if (toDate) sumParams.append("to_date", `${toDate}T23:59:59`);

      const [sumRes, catRes, txRes, pendingRes] = await Promise.all([
        personalFinanceService.getFinancialSummary(sumParams),
        personalFinanceService.getCategories(),
        personalFinanceService.getTransactions(txParams),
        qrPaymentService.listOutgoingPayments("PENDING"),
      ]);

      if (sumRes.data) setSummary(sumRes.data);
      if (catRes.data) setCategories(catRes.data);
      if (txRes.data) setTransactions(txRes.data);
      if (pendingRes.data) {
        setPendingExpenses(pendingRes.data.items);
        setTotalPendingAmount(pendingRes.data.total_pending_amount);
      }
    } catch (err) {
      console.error("Error fetching financial data:", err);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, selectedWalletId, selectedCategoryId, selectedType, selectedSource]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const displayedTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!selectedGroupName) return true;
      return t.description?.includes(`[${selectedGroupName}]`);
    });
  }, [transactions, selectedGroupName]);

  const filteredTotalExpense = useMemo(() => {
    return displayedTransactions
      .filter(
        (t) =>
          t.transaction_type === "EXPENSE" ||
          t.transaction_type === "GROUP_SETTLEMENT_PAID" ||
          t.transaction_type === "FUND_CONTRIBUTION"
      )
      .reduce((sum, t) => sum + t.amount, 0);
  }, [displayedTransactions]);

  const filteredTotalIncome = useMemo(() => {
    return displayedTransactions
      .filter(
        (t) =>
          t.transaction_type === "INCOME" ||
          t.transaction_type === "GROUP_SETTLEMENT_RECEIVED" ||
          t.transaction_type === "FUND_WITHDRAWAL"
      )
      .reduce((sum, t) => sum + t.amount, 0);
  }, [displayedTransactions]);

  const computedExpenseBreakdown: CategoryExpenseBreakdown[] = useMemo(() => {
    const expenseTx = displayedTransactions.filter(
      (t) =>
        t.transaction_type === "EXPENSE" ||
        t.transaction_type === "GROUP_SETTLEMENT_PAID" ||
        t.transaction_type === "FUND_CONTRIBUTION"
    );
    const catMap = new Map<string, { name: string; amount: number }>();
    expenseTx.forEach((t) => {
      const key = t.category_id || "uncategorized";
      const name = t.category_name || (t.category_id ? "Danh mục khác" : "Chưa phân loại");
      const current = catMap.get(key) || { name, amount: 0 };
      catMap.set(key, { name, amount: current.amount + t.amount });
    });
    const total = filteredTotalExpense || 1;
    return Array.from(catMap.entries()).map(([cid, val]) => ({
      category_id: cid === "uncategorized" ? null : cid,
      category_name: val.name,
      total_amount: val.amount,
      percentage: Math.round((val.amount / total) * 100),
    }));
  }, [displayedTransactions, filteredTotalExpense]);

  const computedIncomeBreakdown: CategoryExpenseBreakdown[] = useMemo(() => {
    const incomeTx = displayedTransactions.filter(
      (t) =>
        t.transaction_type === "INCOME" ||
        t.transaction_type === "GROUP_SETTLEMENT_RECEIVED" ||
        t.transaction_type === "FUND_WITHDRAWAL"
    );
    const catMap = new Map<string, { name: string; amount: number }>();
    incomeTx.forEach((t) => {
      const key = t.category_id || "uncategorized";
      const name = t.category_name || (t.category_id ? "Nguồn thu khác" : "Thu nhập chưa phân loại");
      const current = catMap.get(key) || { name, amount: 0 };
      catMap.set(key, { name, amount: current.amount + t.amount });
    });
    const total = filteredTotalIncome || 1;
    return Array.from(catMap.entries()).map(([cid, val]) => ({
      category_id: cid === "uncategorized" ? null : cid,
      category_name: val.name,
      total_amount: val.amount,
      percentage: Math.round((val.amount / total) * 100),
    }));
  }, [displayedTransactions, filteredTotalIncome]);

  return {
    viewMode,
    setViewMode,
    summary,
    categories,
    transactions,
    displayedTransactions,
    loading,
    pendingExpenses,
    totalPendingAmount,
    groups,
    filteredTotalExpense,
    filteredTotalIncome,
    computedExpenseBreakdown,
    computedIncomeBreakdown,
    fetchData,
    // Filters
    datePreset,
    fromDate,
    toDate,
    selectedWalletId,
    selectedType,
    selectedCategoryId,
    selectedSource,
    selectedGroupName,
    showFilters,
    setShowFilters,
    setFromDate,
    setToDate,
    setSelectedWalletId,
    setSelectedType,
    setSelectedCategoryId,
    setSelectedSource,
    setSelectedGroupName,
    handlePresetChange,
    resetFilters,
    hasActiveFilters,
  };
}

