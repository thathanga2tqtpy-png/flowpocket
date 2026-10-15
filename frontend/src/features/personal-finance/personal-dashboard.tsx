"use client";

import React, { useState } from "react";
import { Wallet } from "./types";
import { WalletModal } from "./wallet-modal";
import { TransactionModal } from "./transaction-modal";
import { TransferModal } from "./transfer-modal";
import {
  Wallet as WalletIcon,
  BarChart3,
  RefreshCw,
  Filter,
} from "lucide-react";
import { QRPaymentModal } from "@/features/qr-payments/qr-payment-modal";
import { QRScannerModal } from "@/features/qr-payments/qr-scanner-modal";
import { PendingExpensesCard } from "@/features/qr-payments/pending-expenses-card";
import { formatAuditDateTime, formatFullAuditTimestamp } from "@/lib/date-utils";

import { PersonalFilterPanel } from "./components/personal-filter-panel";
import { PersonalAssetBanner } from "./components/personal-asset-banner";
import { PersonalWalletList } from "./components/personal-wallet-list";
import { PersonalTransactionList } from "./components/personal-transaction-list";
import { PersonalBreakdownReports } from "./components/personal-breakdown-reports";

import { usePersonalFinance } from "./hooks/use-personal-finance";

export function PersonalDashboard() {
  const {
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
  } = usePersonalFinance();

  // Modals state
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletToEdit, setWalletToEdit] = useState<Wallet | null>(null);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);

  const formatVND = (amount: number) => {
    return amount.toLocaleString("vi-VN") + " đ";
  };

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
          transactions={displayedTransactions}
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
