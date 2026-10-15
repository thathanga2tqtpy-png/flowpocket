"use client";

import React from "react";
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
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Smart Personal Cash Flow Chart */}
      <CashFlowChart transactions={transactions} />

      {/* Expense & Income Breakdown by Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Phân bổ chi tiêu */}
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
              <span>Phân bổ chi tiêu</span>
            </h4>
            {summary && (
              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                {formatVND(summary.total_expense)}
              </span>
            )}
          </div>
          {summary?.expense_breakdown && summary.expense_breakdown.length > 0 ? (
            <div className="space-y-2.5">
              {summary.expense_breakdown.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-700">
                    <span className="font-medium">{item.category_name}</span>
                    <span className="font-semibold">{formatVND(item.total_amount)} ({item.percentage}%)</span>
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
              Chưa có dữ liệu chi tiêu trong kỳ này
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
            {summary && (
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                {formatVND(summary.total_income)}
              </span>
            )}
          </div>
          {summary?.income_breakdown && summary.income_breakdown.length > 0 ? (
            <div className="space-y-2.5">
              {summary.income_breakdown.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-700">
                    <span className="font-medium">{item.category_name}</span>
                    <span className="font-semibold">{formatVND(item.total_amount)} ({item.percentage}%)</span>
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
              Chưa có dữ liệu thu nhập trong kỳ này
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

