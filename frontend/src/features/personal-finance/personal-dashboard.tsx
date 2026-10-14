"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Wallet, Category, Transaction, FinancialSummary } from "./types";
import { WalletModal } from "./wallet-modal";
import { TransactionModal } from "./transaction-modal";
import { TransferModal } from "./transfer-modal";
import {
  Wallet as WalletIcon,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  PieChart,
  RefreshCw,
  Clock,
} from "lucide-react";

export function PersonalDashboard() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, catRes, txRes] = await Promise.all([
        apiRequest<FinancialSummary>("/api/v1/transactions/summary"),
        apiRequest<Category[]>("/api/v1/categories"),
        apiRequest<Transaction[]>("/api/v1/transactions?limit=20"),
      ]);

      if (sumRes.data) setSummary(sumRes.data);
      if (catRes.data) setCategories(catRes.data);
      if (txRes.data) setTransactions(txRes.data);
    } catch (err) {
      console.error("Error fetching financial data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatVND = (amount: number) => {
    return amount.toLocaleString("vi-VN") + " đ";
  };

  return (
    <div className="space-y-6">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Tổng tài sản
          </span>
          <span className="text-base sm:text-lg font-bold text-slate-900 block truncate">
            {summary ? formatVND(summary.total_assets) : "0 đ"}
          </span>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 uppercase tracking-wider mb-1">
            <TrendingUp className="h-3 w-3" />
            <span>Thu nhập</span>
          </div>
          <span className="text-base sm:text-lg font-bold text-emerald-700 block truncate">
            {summary ? formatVND(summary.total_income) : "0 đ"}
          </span>
        </div>

        <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-3.5">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-700 uppercase tracking-wider mb-1">
            <TrendingDown className="h-3 w-3" />
            <span>Chi tiêu</span>
          </div>
          <span className="text-base sm:text-lg font-bold text-rose-700 block truncate">
            {summary ? formatVND(summary.total_expense) : "0 đ"}
          </span>
        </div>

        <div className="bg-sky-50/60 border border-sky-200/80 rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider block mb-1">
            Dòng tiền ròng
          </span>
          <span
            className={`text-base sm:text-lg font-bold block truncate ${
              (summary?.net_cash_flow || 0) >= 0 ? "text-sky-800" : "text-rose-700"
            }`}
          >
            {summary ? formatVND(summary.net_cash_flow) : "0 đ"}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setTxModalOpen(true)}
          disabled={!summary?.wallets.length}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Ghi thu/chi</span>
        </button>

        <button
          onClick={() => setTransferModalOpen(true)}
          disabled={(summary?.wallets.length || 0) < 2}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          <span>Chuyển ví</span>
        </button>

        <button
          onClick={() => setWalletModalOpen(true)}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-all shadow-sm"
        >
          <WalletIcon className="h-3.5 w-3.5 text-slate-500" />
          <span>Thêm ví</span>
        </button>

        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
          title="Làm mới dữ liệu"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Wallets List Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <WalletIcon className="h-3.5 w-3.5 text-sky-600" />
            <span>Ví & Tài khoản ({summary?.wallets.length || 0})</span>
          </h3>
        </div>

        {summary?.wallets.length === 0 ? (
          <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-500">
            Bạn chưa có ví nào. Hãy nhấn "Thêm ví" để bắt đầu theo dõi dòng tiền!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {summary?.wallets.map((w) => (
              <div
                key={w.id}
                className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-slate-800 block truncate max-w-[140px]">
                    {w.name}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 uppercase">
                    {w.wallet_type}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-sky-700 block">
                    {formatVND(w.current_balance)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expense Breakdown */}
      {summary && summary.expense_breakdown.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <PieChart className="h-3.5 w-3.5 text-rose-500" />
            <span>Phân bổ chi tiêu theo danh mục</span>
          </h4>
          <div className="space-y-2">
            {summary.expense_breakdown.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-700">
                  <span>{item.category_name}</span>
                  <span className="font-semibold">{formatVND(item.total_amount)} ({item.percentage}%)</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-slate-500" />
          <span>Lịch sử giao dịch gần đây</span>
        </h3>

        {transactions.length === 0 ? (
          <div className="p-6 text-center border border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-400">
            Chưa có giao dịch nào được ghi nhận.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
            {transactions.map((tx) => {
              const isIncome = tx.transaction_type === "INCOME" || tx.transaction_type === "TRANSFER_IN";
              const isTransfer = tx.transaction_type.startsWith("TRANSFER");

              return (
                <div
                  key={tx.id}
                  className="p-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                        isTransfer
                          ? "bg-indigo-50 text-indigo-600"
                          : isIncome
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-rose-50 text-rose-600"
                      }`}
                    >
                      {isTransfer ? (
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                      ) : isIncome ? (
                        <ArrowDownLeft className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800 block truncate max-w-[150px] sm:max-w-[200px]">
                        {tx.description || tx.category_name || tx.transaction_type}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {tx.wallet_name} • {new Date(tx.transaction_date).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-bold block ${
                        isTransfer
                          ? "text-indigo-600"
                          : isIncome
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }`}
                    >
                      {isIncome ? "+" : "-"}
                      {formatVND(tx.amount)}
                    </span>
                    {tx.category_name && !isTransfer && (
                      <span className="text-[10px] text-slate-400 block">
                        {tx.category_name}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <WalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
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
    </div>
  );
}

