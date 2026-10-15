"use client";

import React, { useMemo } from "react";
import { GroupFund, GroupFundTransaction } from "../types";
import { formatAuditDateTime, formatFullAuditTimestamp } from "@/lib/date-utils";
import { Wallet, TrendingUp, TrendingDown, Users, PiggyBank, ArrowDownRight, ArrowUpRight } from "lucide-react";

interface GroupFundSectionProps {
  fund: GroupFund | null;
  fundTransactions: GroupFundTransaction[];
  onOpenFundModal: () => void;
}

export function GroupFundSection({
  fund,
  fundTransactions,
  onOpenFundModal,
}: GroupFundSectionProps) {
  // Tính toán số liệu thống kê quỹ
  const { totalInflow, totalOutflow, memberContributions } = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    const memberMap: Record<string, { name: string; amount: number }> = {};

    fundTransactions.forEach((tx) => {
      const isPositive =
        tx.transaction_type === "CONTRIBUTION" ||
        tx.transaction_type === "ADJUSTMENT_IN";

      if (isPositive) {
        inflow += tx.amount;
        if (tx.transaction_type === "CONTRIBUTION") {
          const key = tx.contributed_by_user_id || "unknown";
          const name = tx.contributor_name || "Thành viên nhóm";
          if (!memberMap[key]) {
            memberMap[key] = { name, amount: 0 };
          }
          memberMap[key].amount += tx.amount;
        }
      } else {
        outflow += tx.amount;
      }
    });

    const membersList = Object.values(memberMap).sort((a, b) => b.amount - a.amount);

    return {
      totalInflow: inflow,
      totalOutflow: outflow,
      memberContributions: membersList,
    };
  }, [fundTransactions]);

  const currentBalance = fund ? fund.balance : 0;

  return (
    <div className="space-y-4">
      {/* 1. Fund Overview Banner with 3 KPI Cards */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <PiggyBank className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Quỹ chung của nhóm</h3>
              <p className="text-xs text-slate-500">
                Chi tiêu các khoản chung độc lập, không tạo nợ cá nhân cho thành viên
              </p>
            </div>
          </div>

          <button
            onClick={onOpenFundModal}
            className="w-full sm:w-auto px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Wallet className="h-4 w-4" />
            <span>Nạp / Rút quỹ nhóm</span>
          </button>
        </div>

        {/* 3 Metric Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Số dư quỹ hiện tại
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight block">
              {currentBalance.toLocaleString("vi-VN")} đ
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Sẵn sàng chi trả</span>
          </div>

          <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1 mb-1">
              <TrendingUp className="h-3 w-3" />
              <span>Đã huy động</span>
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-700 tracking-tight block">
              +{totalInflow.toLocaleString("vi-VN")} đ
            </span>
            <span className="text-[10px] text-emerald-600/80 mt-0.5 block">Tổng tiền thành viên nạp</span>
          </div>

          <div className="p-3.5 bg-rose-50/50 border border-rose-100 rounded-xl">
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1 mb-1">
              <TrendingDown className="h-3 w-3" />
              <span>Đã chi từ quỹ</span>
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-rose-700 tracking-tight block">
              -{totalOutflow.toLocaleString("vi-VN")} đ
            </span>
            <span className="text-[10px] text-rose-600/80 mt-0.5 block">Khoản chi chung & rút quỹ</span>
          </div>
        </div>
      </div>

      {/* 2. Member Contribution Breakdown */}
      {memberContributions.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-purple-600" />
              <span>Đóng góp của các thành viên ({memberContributions.length})</span>
            </h4>
            <span className="text-[11px] text-slate-400 font-medium">
              Tỷ lệ / Tổng nạp
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {memberContributions.map((member, idx) => {
              const percentage = totalInflow > 0 ? Math.round((member.amount / totalInflow) * 100) : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-700">
                    <span className="font-semibold">{member.name}</span>
                    <span className="font-bold text-slate-900">
                      {member.amount.toLocaleString("vi-VN")} đ{" "}
                      <span className="text-slate-400 font-normal">({percentage}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Fund Transactions History */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5 text-sky-600" />
          <span>Lịch sử dòng tiền quỹ ({fundTransactions.length})</span>
        </h4>

        {fundTransactions.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            Chưa có giao dịch quỹ nào được ghi nhận. Hãy bấm "Nạp / Rút quỹ nhóm" để bắt đầu.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {fundTransactions.map((tx) => {
              const isPositive =
                tx.transaction_type === "CONTRIBUTION" ||
                tx.transaction_type === "ADJUSTMENT_IN";
              return (
                <div
                  key={tx.id}
                  className="py-3 flex justify-between items-center hover:bg-slate-50/50 transition-colors px-1"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      }`}
                    >
                      {isPositive ? (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">
                        {tx.description ||
                          (isPositive ? "Đóng góp quỹ nhóm" : "Chi tiêu từ quỹ")}
                      </div>
                      <div
                        className="text-[11px] text-slate-400"
                        title={`Thời gian ghi nhận: ${formatFullAuditTimestamp(tx.created_at || tx.transaction_date)}`}
                      >
                        {formatAuditDateTime(tx.transaction_date || tx.created_at)}
                        {tx.contributor_name && ` • Đóng góp bởi ${tx.contributor_name}`}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`font-bold text-right shrink-0 ${
                      isPositive ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {isPositive
                      ? `+${tx.amount.toLocaleString("vi-VN")} đ`
                      : `-${tx.amount.toLocaleString("vi-VN")} đ`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
