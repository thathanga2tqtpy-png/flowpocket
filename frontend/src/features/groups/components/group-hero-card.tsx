"use client";

import React from "react";
import { GroupDebtOverview, GroupExpense, GroupFund } from "../types";
import { Plus, ArrowLeftRight } from "lucide-react";

interface GroupHeroCardProps {
  debtsOverview: GroupDebtOverview | null;
  expenses: GroupExpense[];
  fund: GroupFund | null;
  currentUserId?: string;
  onOpenExpenseModal: () => void;
  onNavigateToDebts: () => void;
}

export function GroupHeroCard({
  debtsOverview,
  expenses,
  fund,
  currentUserId,
  onOpenExpenseModal,
  onNavigateToDebts,
}: GroupHeroCardProps) {
  const currentNet = debtsOverview?.current_user_net || 0;
  const myTotalPaid = expenses
    .filter((e) => e.status !== "VOID" && e.paid_by_user_id === currentUserId)
    .reduce((sum, e) => sum + e.total_amount, 0);
  const groupTotalExp = expenses
    .filter((e) => e.status !== "VOID")
    .reduce((sum, e) => sum + e.total_amount, 0);

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs text-slate-400 block font-medium">
            Tình trạng công nợ của bạn
          </span>
          <div className="mt-1 flex items-baseline gap-2 flex-wrap">
            <span
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                currentNet > 0
                  ? "text-emerald-400"
                  : currentNet < 0
                    ? "text-rose-400"
                    : "text-slate-100"
              }`}
            >
              {currentNet > 0 ? "+ " : ""}
              {currentNet.toLocaleString("vi-VN")} đ
            </span>
            <span className="text-xs text-slate-300 font-medium">
              {currentNet > 0
                ? "• Bạn được nhận lại"
                : currentNet < 0
                  ? "• Bạn cần chuyển trả"
                  : "• Bạn đã sòng phẳng"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 sm:pt-0">
          <button
            onClick={onOpenExpenseModal}
            className="flex-1 sm:flex-none px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm chi tiêu</span>
          </button>
          <button
            onClick={onNavigateToDebts}
            className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 active:scale-98"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 text-slate-400" />
            <span>Quyết toán</span>
          </button>
        </div>
      </div>

      {/* Sub-metrics bar */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-400">
        <div>
          Quỹ nhóm:{" "}
          <strong className="text-slate-100 font-semibold">
            {fund ? `${fund.balance.toLocaleString("vi-VN")} đ` : "0 đ"}
          </strong>
        </div>
        <span className="text-slate-700">•</span>
        <div>
          Bạn đã chi:{" "}
          <strong className="text-slate-100 font-semibold">
            {myTotalPaid.toLocaleString("vi-VN")} đ
          </strong>
        </div>
        <span className="text-slate-700 hidden sm:inline">•</span>
        <div className="hidden sm:block">
          Tổng chi cả nhóm:{" "}
          <strong className="text-slate-100 font-semibold">
            {groupTotalExp.toLocaleString("vi-VN")} đ
          </strong>
        </div>
      </div>
    </div>
  );
}

