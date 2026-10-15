"use client";

import React, { useState } from "react";
import { GroupExpense, GroupDetail } from "../types";
import { formatAuditDateTime, formatFullAuditTimestamp } from "@/lib/date-utils";
import {
  Receipt,
  Wallet,
  Filter,
  RotateCcw,
  Ban,
} from "lucide-react";

interface GroupExpenseListProps {
  expenses: GroupExpense[];
  groupDetail: GroupDetail;
  currentUserId?: string;
  onVoidExpense: (exp: GroupExpense) => void;
  // Filters
  expDatePreset: "ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "CUSTOM";
  setExpDatePreset: (p: "ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "CUSTOM") => void;
  expFromDate: string;
  setExpFromDate: (d: string) => void;
  expToDate: string;
  setExpToDate: (d: string) => void;
  expPaymentSource: string;
  setExpPaymentSource: (s: string) => void;
  expPaidByUserId: string;
  setExpPaidByUserId: (u: string) => void;
  expStatus: string;
  setExpStatus: (s: string) => void;
  onPresetChange: (p: "ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "CUSTOM") => void;
  onResetFilters: () => void;
}

export function GroupExpenseList({
  expenses,
  groupDetail,
  currentUserId,
  onVoidExpense,
  expDatePreset,
  setExpDatePreset,
  expFromDate,
  setExpFromDate,
  expToDate,
  setExpToDate,
  expPaymentSource,
  setExpPaymentSource,
  expPaidByUserId,
  setExpPaidByUserId,
  expStatus,
  setExpStatus,
  onPresetChange,
  onResetFilters,
}: GroupExpenseListProps) {
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters =
    expDatePreset !== "ALL" ||
    expPaymentSource !== "" ||
    expPaidByUserId !== "" ||
    expStatus !== "";

  const totalValidAmount = expenses
    .filter((e) => e.status !== "VOID")
    .reduce((sum, e) => sum + e.total_amount, 0);

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex flex-wrap justify-between items-center gap-2 px-1">
        <div>
          <span className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5 text-sky-600" />
            Danh sách chi tiêu ({expenses.length})
          </span>
          <span className="text-[11px] text-slate-500">
            Tổng chi hợp lệ:{" "}
            <strong className="text-slate-800">
              {totalValidAmount.toLocaleString("vi-VN")} đ
            </strong>
          </span>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg border transition ${
            showFilters || hasActiveFilters
              ? "bg-sky-50 border-sky-300 text-sky-700"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          <span>Bộ lọc</span>
          {hasActiveFilters && (
            <span className="h-2 w-2 rounded-full bg-sky-600 ml-0.5" />
          )}
        </button>
      </div>

      {/* FILTER PANEL */}
      {showFilters && (
        <div className="p-3.5 bg-white border border-slate-200/90 rounded-xl space-y-3 shadow-2xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Filter className="h-3 w-3 text-sky-600" />
              Bộ lọc chi tiêu
            </span>
            {hasActiveFilters && (
              <button
                onClick={onResetFilters}
                className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Đặt lại
              </button>
            )}
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Thời gian
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Tất cả", val: "ALL" },
                { label: "Hôm nay", val: "TODAY" },
                { label: "Tuần này", val: "THIS_WEEK" },
                { label: "Tháng này", val: "THIS_MONTH" },
                { label: "Tùy chọn", val: "CUSTOM" },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => onPresetChange(p.val as any)}
                  className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition ${
                    expDatePreset === p.val
                      ? "bg-sky-600 text-white font-semibold"
                      : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {expDatePreset === "CUSTOM" && (
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">
                    Từ ngày
                  </span>
                  <input
                    type="date"
                    value={expFromDate}
                    onChange={(e) => setExpFromDate(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-800 bg-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">
                    Đến ngày
                  </span>
                  <input
                    type="date"
                    value={expToDate}
                    onChange={(e) => setExpToDate(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-800 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Dropdown Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-100">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                Nguồn tiền
              </label>
              <select
                value={expPaymentSource}
                onChange={(e) => setExpPaymentSource(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800 bg-slate-50"
              >
                <option value="">-- Tất cả nguồn --</option>
                <option value="MEMBER">Thành viên tự trả</option>
                <option value="FUND">Quỹ chung chi</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                Người đã trả tiền
              </label>
              <select
                value={expPaidByUserId}
                onChange={(e) => setExpPaidByUserId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800 bg-slate-50"
              >
                <option value="">-- Tất cả thành viên --</option>
                {groupDetail.members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user_full_name ||
                      m.display_name ||
                      m.user_email ||
                      m.email}
                    {m.user_id === currentUserId ? " (Bạn)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                Trạng thái
              </label>
              <select
                value={expStatus}
                onChange={(e) => setExpStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800 bg-slate-50"
              >
                <option value="">-- Tất cả trạng thái --</option>
                <option value="POSTED">Hợp lệ (POSTED)</option>
                <option value="VOID">Đã hủy (VOID)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* EXPENSE LIST ITEMS */}
      {expenses.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center text-xs text-slate-400 space-y-2">
          <Receipt className="h-8 w-8 mx-auto text-slate-300" />
          <p>Chưa có khoản chi nào trong nhóm này.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs divide-y divide-slate-100">
          {expenses.map((exp) => {
            const isVoid = exp.status === "VOID";
            const isPayer = exp.paid_by_user_id === currentUserId;
            const mySplit = exp.splits?.find(
              (s) => s.member_user_id === currentUserId,
            );

            return (
              <div
                key={exp.id}
                className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition ${
                  isVoid ? "opacity-50 bg-slate-50/30" : ""
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      isVoid
                        ? "bg-slate-100 text-slate-400"
                        : exp.payment_source === "FUND"
                          ? "bg-amber-50 text-amber-600 border border-amber-200/60"
                          : isPayer
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                            : "bg-sky-50 text-sky-600 border border-sky-200/60"
                    }`}
                  >
                    {exp.payment_source === "FUND" ? (
                      <Wallet className="h-4 w-4" />
                    ) : (
                      <Receipt className="h-4 w-4" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-semibold text-xs sm:text-sm truncate ${
                          isVoid
                            ? "line-through text-slate-400"
                            : "text-slate-800"
                        }`}
                      >
                        {exp.title}
                      </span>
                      {isVoid ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-medium">
                          Đã hủy
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium border border-slate-200">
                          {exp.payment_source === "FUND"
                            ? "Quỹ chi"
                            : isPayer
                              ? "Bạn đã trả"
                              : `${exp.paid_by_name || "Thành viên"} trả`}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                      <span
                        title={`Thời gian ghi nhận: ${formatFullAuditTimestamp(exp.created_at || exp.expense_date)}`}
                      >
                        {formatAuditDateTime(
                          exp.created_at || exp.expense_date,
                        )}
                      </span>
                      <span>•</span>
                      <span>
                        {exp.splits.length} người chia (
                        {exp.split_method === "EQUAL" ? "Chia đều" : "Tùy chọn"})
                      </span>
                      {isVoid && exp.void_reason && (
                        <span className="text-rose-500 italic">
                          ({exp.void_reason})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-right">
                  <div>
                    <div
                      className={`text-xs sm:text-sm font-bold ${
                        isVoid
                          ? "text-slate-400 line-through"
                          : "text-slate-900"
                      }`}
                    >
                      {exp.total_amount.toLocaleString("vi-VN")} đ
                    </div>
                    {!isVoid && (
                      <div className="text-[10px] sm:text-[11px] font-medium mt-0.5">
                        {exp.payment_source === "FUND" ? (
                          <span className="text-slate-400">Từ quỹ chung</span>
                        ) : isPayer ? (
                          <span className="text-emerald-600 font-semibold">
                            Bạn nhận +
                            {(
                              exp.total_amount - (mySplit?.amount_owed || 0)
                            ).toLocaleString("vi-VN")}{" "}
                            đ
                          </span>
                        ) : mySplit ? (
                          <span className="text-rose-600 font-semibold">
                            Bạn nợ -{mySplit.amount_owed.toLocaleString("vi-VN")}{" "}
                            đ
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            Không chia bạn
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {!isVoid && (
                    <button
                      onClick={() => onVoidExpense(exp)}
                      title="Hủy khoản chi này"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Ban className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
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

