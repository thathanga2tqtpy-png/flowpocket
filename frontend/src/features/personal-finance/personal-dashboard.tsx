"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiRequest } from "@/lib/api-client";
import { Wallet, Category, Transaction, FinancialSummary } from "./types";
import { WalletModal } from "./wallet-modal";
import { TransactionModal } from "./transaction-modal";
import { TransferModal } from "./transfer-modal";
import { formatAuditDateTime, formatFullAuditTimestamp } from "@/lib/date-utils";
import {
  Wallet as WalletIcon,
  BarChart3,
  RefreshCw,
  Filter,
} from "lucide-react";
import { QRPaymentModal } from "@/features/qr-payments/qr-payment-modal";
import { QRScannerModal } from "@/features/qr-payments/qr-scanner-modal";
import { PendingExpensesCard } from "@/features/qr-payments/pending-expenses-card";
import { qrPaymentService } from "@/features/qr-payments/qr-service";
import { OutgoingPaymentRequest } from "@/features/qr-payments/types";

import { PersonalFilterPanel } from "./components/personal-filter-panel";
import { PersonalAssetBanner } from "./components/personal-asset-banner";
import { PersonalWalletList } from "./components/personal-wallet-list";
import { PersonalTransactionList } from "./components/personal-transaction-list";
import { PersonalBreakdownReports } from "./components/personal-breakdown-reports";

export function PersonalDashboard() {
  const [viewMode, setViewMode] = useState<"overview" | "reports">("overview");
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [datePreset, setDatePreset] = useState<
    "ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "LAST_MONTH" | "CUSTOM"
  >("ALL");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [selectedGroupName, setSelectedGroupName] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Modals state
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletToEdit, setWalletToEdit] = useState<Wallet | null>(null);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);

  // Outgoing Pending Expenses state
  const [pendingExpenses, setPendingExpenses] = useState<OutgoingPaymentRequest[]>([]);
  const [totalPendingAmount, setTotalPendingAmount] = useState<number>(0);

  // Compute dates based on preset
  const handlePresetChange = (
    preset: "ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "LAST_MONTH" | "CUSTOM"
  ) => {
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
    apiRequest<any[]>("/api/v1/groups").then((res) => {
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
        apiRequest<FinancialSummary>(
          `/api/v1/transactions/summary${sumParams.toString() ? `?${sumParams.toString()}` : ""}`
        ),
        apiRequest<Category[]>("/api/v1/categories"),
        apiRequest<Transaction[]>(`/api/v1/transactions?${txParams.toString()}`),
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

  const formatVND = (amount: number) => {
    return amount.toLocaleString("vi-VN") + " đ";
  };

  const displayedTransactions = transactions.filter((t) => {
    if (!selectedGroupName) return true;
    return t.description?.includes(`[${selectedGroupName}]`);
  });

  const filteredTotalExpense = displayedTransactions
    .filter(
      (t) =>
        t.transaction_type === "EXPENSE" ||
        t.transaction_type === "GROUP_SETTLEMENT_PAID" ||
        t.transaction_type === "FUND_CONTRIBUTION"
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredTotalIncome = displayedTransactions
    .filter(
      (t) =>
        t.transaction_type === "INCOME" ||
        t.transaction_type === "GROUP_SETTLEMENT_RECEIVED" ||
        t.transaction_type === "FUND_WITHDRAWAL"
    )
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-4">
      {/* 1. Sub-tab Navigation & Fast Actions */}
      <div className="flex items-center justify-between gap-2 bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 flex-1 sm:flex-initial">
          <button
            onClick={() => setViewMode("overview")}
            className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
              viewMode === "overview"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <WalletIcon className="h-3.5 w-3.5 text-sky-600 shrink-0" />
            <span>Ví & Giao dịch</span>
          </button>
          <button
            onClick={() => setViewMode("reports")}
            className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
              viewMode === "reports"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <span>Báo cáo</span>
          </button>
        </div>

        {/* Action buttons: Filter & Refresh */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 py-1.5 px-2.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              showFilters || hasActiveFilters
                ? "bg-sky-50 border-sky-300 text-sky-700"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Bộ lọc</span>
            {hasActiveFilters && (
              <span className="h-1.5 w-1.5 rounded-full bg-sky-600" />
            )}
          </button>

          <button
            onClick={fetchData}
            title="Tải lại dữ liệu"
            className="p-1.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* FILTER PANEL */}
      {showFilters && (
        <PersonalFilterPanel
          datePreset={datePreset}
          fromDate={fromDate}
          toDate={toDate}
          onPresetChange={handlePresetChange}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          selectedWalletId={selectedWalletId}
          onWalletChange={setSelectedWalletId}
          wallets={summary?.wallets || []}
          selectedSource={selectedSource}
          onSourceChange={setSelectedSource}
          selectedGroupName={selectedGroupName}
          onGroupNameChange={setSelectedGroupName}
          groups={groups}
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={setSelectedCategoryId}
          categories={categories}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={resetFilters}
          formatVND={formatVND}
        />
      )}

      {/* VIEW MODE 1: VÍ & GIAO DỊCH */}
      {viewMode === "overview" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <PersonalAssetBanner
            summary={summary}
            pendingExpensesCount={pendingExpenses.length}
            onOpenTxModal={() => setTxModalOpen(true)}
            onOpenQrScanner={() => setQrScannerOpen(true)}
            onOpenQrModal={() => setQrModalOpen(true)}
            onOpenTransferModal={() => setTransferModalOpen(true)}
            formatVND={formatVND}
          />

          <PendingExpensesCard
            items={pendingExpenses}
            totalPendingAmount={totalPendingAmount}
            onUpdated={fetchData}
          />

          <PersonalWalletList
            wallets={summary?.wallets || []}
            selectedWalletId={selectedWalletId}
            onSelectWallet={setSelectedWalletId}
            onCreateWallet={() => {
              setWalletToEdit(null);
              setWalletModalOpen(true);
            }}
            onEditWallet={(w) => {
              setWalletToEdit(w);
              setWalletModalOpen(true);
            }}
            formatVND={formatVND}
          />

          <PersonalTransactionList
            displayedTransactions={displayedTransactions}
            filteredTotalExpense={filteredTotalExpense}
            filteredTotalIncome={filteredTotalIncome}
            hasActiveFilters={hasActiveFilters}
            onResetFilters={resetFilters}
            formatVND={formatVND}
            formatAuditDateTime={formatAuditDateTime}
            formatFullAuditTimestamp={formatFullAuditTimestamp}
          />
        </div>
      )}

      {/* VIEW MODE 2: BÁO CÁO & PHÂN TÍCH */}
      {viewMode === "reports" && (
        <PersonalBreakdownReports
          transactions={transactions}
          summary={summary}
          formatVND={formatVND}
        />
      )}

      {/* Modals */}
      <WalletModal
        isOpen={walletModalOpen}
        walletToEdit={walletToEdit}
        onClose={() => {
          setWalletModalOpen(false);
          setWalletToEdit(null);
        }}
        onSuccess={fetchData}
      />

      <TransactionModal
        isOpen={txModalOpen}
        wallets={summary?.wallets || []}
        categories={categories}
        onClose={() => setTxModalOpen(false)}
        onSuccess={fetchData}
      />

      <TransferModal
        isOpen={transferModalOpen}
        wallets={summary?.wallets || []}
        onClose={() => setTransferModalOpen(false)}
        onSuccess={fetchData}
      />

      <QRPaymentModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        wallets={summary?.wallets || []}
        categories={categories}
        onTransactionCreated={fetchData}
        onEditWallet={(w) => {
          setWalletToEdit(w);
          setWalletModalOpen(true);
        }}
        onCreateWallet={() => {
          setWalletToEdit(null);
          setWalletModalOpen(true);
        }}
      />

      <QRScannerModal
        isOpen={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
        wallets={summary?.wallets || []}
        categories={categories}
        onExpenseRecorded={fetchData}
      />
    </div>
  );
}
