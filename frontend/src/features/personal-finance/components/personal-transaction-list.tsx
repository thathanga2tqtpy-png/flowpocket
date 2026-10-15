"use client";

import React from "react";
import {
  Clock,
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { Transaction } from "../types";

interface PersonalTransactionListProps {
  displayedTransactions: Transaction[];
  filteredTotalExpense: number;
  filteredTotalIncome: number;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  formatVND: (amount: number) => string;
  formatAuditDateTime: (dt: string) => string;
  formatFullAuditTimestamp: (dt: string) => string;
}

export function PersonalTransactionList({
  displayedTransactions,
  filteredTotalExpense,
  filteredTotalIncome,
  hasActiveFilters,
  onResetFilters,
  formatVND,
  formatAuditDateTime,
  formatFullAuditTimestamp,
}: PersonalTransactionListProps) {
  return (
    <div className="space-y-2.5 pt-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-1 gap-1.5 sm:gap-2">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
          <Clock className="h-3.5 w-3.5 text-slate-500" />
          <span>Giao dịch gần đây ({displayedTransactions.length})</span>
        </span>

        {/* Quick stats for current filtered list */}
        <div className="flex items-center gap-2.5 text-[11px] whitespace-nowrap overflow-x-auto">
          {filteredTotalExpense > 0 && (
            <span className="text-rose-600 font-bold whitespace-nowrap">
              Chi: -{formatVND(filteredTotalExpense)}
            </span>
          )}
          {filteredTotalExpense > 0 && filteredTotalIncome > 0 && (
            <span className="text-slate-200">•</span>
          )}
          {filteredTotalIncome > 0 && (
            <span className="text-emerald-600 font-bold whitespace-nowrap">
              Thu: +{formatVND(filteredTotalIncome)}
            </span>
          )}
        </div>
      </div>

      {displayedTransactions.length === 0 ? (
        <div className="p-8 text-center border border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-400 space-y-1">
          <p>Không có giao dịch nào phù hợp với bộ lọc.</p>
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="text-sky-600 hover:underline font-semibold mt-1 cursor-pointer"
            >
              Xóa bộ lọc để xem tất cả
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 border border-slate-200/90 rounded-2xl bg-white overflow-hidden shadow-2xs">
          {displayedTransactions.map((tx) => {
            const isIncome =
              tx.transaction_type === "INCOME" ||
              tx.transaction_type === "TRANSFER_IN" ||
              tx.transaction_type === "GROUP_SETTLEMENT_RECEIVED" ||
              tx.transaction_type === "FUND_WITHDRAWAL";
            const isTransfer = tx.transaction_type.startsWith("TRANSFER");
            const isGroupExpense = tx.source_type === "GROUP_EXPENSE";
            const isGroupSettlement =
              tx.source_type === "GROUP_SETTLEMENT" ||
              tx.transaction_type.startsWith("GROUP_SETTLEMENT");
            const isFund =
              tx.transaction_type.startsWith("FUND_") ||
              tx.source_type === "GROUP_FUND";

            return (
              <div
                key={tx.id}
                className="p-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isTransfer
                        ? "bg-indigo-50 text-indigo-600"
                        : isFund
                        ? "bg-purple-50 text-purple-600"
                        : isGroupSettlement
                        ? "bg-amber-50 text-amber-600"
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
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-slate-800 truncate max-w-[150px] sm:max-w-[260px]">
                        {tx.description || tx.category_name || tx.transaction_type}
                      </span>
                      {isGroupExpense && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 font-medium border border-sky-200 shrink-0">
                          Chi nhóm
                        </span>
                      )}
                      {isGroupSettlement && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 font-medium border border-amber-200 shrink-0">
                          Quyết toán nợ
                        </span>
                      )}
                      {isFund && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 font-medium border border-purple-200 shrink-0">
                          Quỹ nhóm
                        </span>
                      )}
                    </div>
                    <span
                      className="text-[10px] text-slate-400 block"
                      title={`Thời gian ghi nhận: ${formatFullAuditTimestamp(tx.created_at || tx.transaction_date)}`}
                    >
                      {tx.wallet_name} • {formatAuditDateTime(tx.transaction_date || tx.created_at)}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
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
                    <span className="text-[10px] text-slate-400 block truncate max-w-[120px]">
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
  );
}

