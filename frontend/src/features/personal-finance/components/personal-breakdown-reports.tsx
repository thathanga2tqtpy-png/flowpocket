"use client";

import React, { useMemo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { CashFlowChart } from "../cash-flow-chart";
import { Transaction, FinancialSummary } from "../types";

interface PersonalBreakdownReportsProps {
  transactions: Transaction[];
  summary: FinancialSummary | null;
  formatVND: (amount: number) => string;
}

export function PersonalBreakdownReports({
  transactions,
  summary,
  formatVND,
}: PersonalBreakdownReportsProps) {
  // Tính toán phân bổ chi tiêu và thu nhập động trực tiếp từ mảng giao dịch đã lọc
  const { expenseBreakdown, totalExpense, incomeBreakdown, totalIncome } = useMemo(() => {
    const expMap: Record<string, number> = {};
    const incMap: Record<string, number> = {};
    let sumExp = 0;
    let sumInc = 0;

    transactions.forEach((tx) => {
      // Nhóm các loại chi tiêu
      if (
        tx.transaction_type === "EXPENSE" ||
        tx.transaction_type === "GROUP_SETTLEMENT_PAID" ||
        tx.transaction_type === "FUND_CONTRIBUTION"
      ) {
        const catName =
          tx.category_name ||
          (tx.transaction_type === "GROUP_SETTLEMENT_PAID"
            ? "Trả nợ nhóm"
            : tx.transaction_type === "FUND_CONTRIBUTION"
            ? "Đóng quỹ nhóm"
            : "Chi tiêu khác");
        expMap[catName] = (expMap[catName] || 0) + tx.amount;
        sumExp += tx.amount;
      }
      // Nhóm các loại thu nhập
      else if (
        tx.transaction_type === "INCOME" ||
        tx.transaction_type === "GROUP_SETTLEMENT_RECEIVED" ||
        tx.transaction_type === "FUND_WITHDRAWAL"
      ) {
        const catName =
          tx.category_name ||
          (tx.transaction_type === "GROUP_SETTLEMENT_RECEIVED"
            ? "Nhận hoàn nợ nhóm"
            : tx.transaction_type === "FUND_WITHDRAWAL"
            ? "Rút quỹ nhóm"
            : "Thu nhập khác");
        incMap[catName] = (incMap[catName] || 0) + tx.amount;
        sumInc += tx.amount;
      }
    });

    const expList = Object.entries(expMap)
      .map(([category_name, total_amount]) => ({
        category_name,
        total_amount,
        percentage: sumExp > 0 ? Math.round((total_amount / sumExp) * 100) : 0,
      }))
      .sort((a, b) => b.total_amount - a.total_amount);

    const incList = Object.entries(incMap)
      .map(([category_name, total_amount]) => ({
        category_name,
        total_amount,
        percentage: sumInc > 0 ? Math.round((total_amount / sumInc) * 100) : 0,
      }))
      .sort((a, b) => b.total_amount - a.total_amount);

    return {
      expenseBreakdown: expList,
      totalExpense: sumExp,
      incomeBreakdown: incList,
      totalIncome: sumInc,
    };
  }, [transactions]);

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Smart Personal Cash Flow Chart */}
      <CashFlowChart transactions={transactions} />

      {/* Expense & Income Breakdown by Category (Đồng bộ 100% với bộ lọc) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Phân bổ chi tiêu */}
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
              <span>Phân bổ chi tiêu</span>
            </h4>
            <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
              {formatVND(totalExpense)}
            </span>
          </div>

          {expenseBreakdown.length > 0 ? (
            <div className="space-y-2.5">
              {expenseBreakdown.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-700">
                    <span className="font-medium">{item.category_name}</span>
                    <span className="font-semibold">
                      {formatVND(item.total_amount)} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, item.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-400">
              Chưa có dữ liệu chi tiêu phù hợp với bộ lọc
            </div>
          )}
        </div>

        {/* Phân bổ thu nhập */}
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              <span>Phân bổ thu nhập</span>
            </h4>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
              {formatVND(totalIncome)}
            </span>
          </div>

          {incomeBreakdown.length > 0 ? (
            <div className="space-y-2.5">
              {incomeBreakdown.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-700">
                    <span className="font-medium">{item.category_name}</span>
                    <span className="font-semibold">
                      {formatVND(item.total_amount)} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, item.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-400">
              Chưa có dữ liệu thu nhập phù hợp với bộ lọc
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
