"use client";

import React, { useState, useMemo } from "react";
import { Transaction } from "./types";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Layers,
  ArrowRight,
} from "lucide-react";

interface CashFlowChartProps {
  transactions: Transaction[];
}

type TimeRange = "7D" | "14D" | "30D" | "6M";

interface AggregatedPoint {
  key: string;
  label: string;
  fullDateLabel: string;
  income: number;
  expense: number;
  net: number;
}

export function CashFlowChart({ transactions }: CashFlowChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("7D");
  const [hoveredPoint, setHoveredPoint] = useState<AggregatedPoint | null>(null);

  const formatVND = (amount: number) => {
    return Math.abs(amount).toLocaleString("vi-VN") + " đ";
  };

  // Tính toán các điểm dữ liệu dựa trên TimeRange
  const { dataPoints, totalIncome, totalExpense, netFlow, avgDailyExpense, peakExpensePoint, savingsRate } =
    useMemo(() => {
      const now = new Date();
      now.setHours(23, 59, 59, 999);

      const points: AggregatedPoint[] = [];

      if (timeRange === "6M") {
        // Gom theo 6 tháng gần nhất
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const year = d.getFullYear();
          const month = d.getMonth() + 1;
          const key = `${year}-${String(month).padStart(2, "0")}`;
          const label = `T${month}`;
          const fullDateLabel = `Tháng ${month}/${year}`;

          points.push({
            key,
            label,
            fullDateLabel,
            income: 0,
            expense: 0,
            net: 0,
          });
        }

        const isCashInflow = (type: string) =>
          type === "INCOME" ||
          type === "GROUP_SETTLEMENT_RECEIVED" ||
          type === "FUND_WITHDRAWAL";

        const isCashOutflow = (type: string) =>
          type === "EXPENSE" ||
          type === "GROUP_SETTLEMENT_PAID" ||
          type === "FUND_CONTRIBUTION";

        transactions.forEach((tx) => {
          if (tx.transaction_type.startsWith("TRANSFER")) return;
          const txDate = new Date(tx.transaction_date);
          const key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}`;
          const match = points.find((p) => p.key === key);
          if (match) {
            if (isCashInflow(tx.transaction_type)) match.income += tx.amount;
            if (isCashOutflow(tx.transaction_type)) match.expense += tx.amount;
          }
        });
      } else {
        // Gom theo ngày: 7 ngày, 14 ngày, hoặc 30 ngày
        const days = timeRange === "7D" ? 7 : timeRange === "14D" ? 14 : 30;

        for (let i = days - 1; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(now.getDate() - i);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          const key = `${year}-${month}-${day}`;
          const label = `${d.getDate()}/${d.getMonth() + 1}`;
          const weekdayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
          const fullDateLabel = `${weekdayNames[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;

          points.push({
            key,
            label,
            fullDateLabel,
            income: 0,
            expense: 0,
            net: 0,
          });
        }

        const isCashInflow = (type: string) =>
          type === "INCOME" ||
          type === "GROUP_SETTLEMENT_RECEIVED" ||
          type === "FUND_WITHDRAWAL";

        const isCashOutflow = (type: string) =>
          type === "EXPENSE" ||
          type === "GROUP_SETTLEMENT_PAID" ||
          type === "FUND_CONTRIBUTION";

        transactions.forEach((tx) => {
          if (tx.transaction_type.startsWith("TRANSFER")) return;
          const txDate = new Date(tx.transaction_date);
          const year = txDate.getFullYear();
          const month = String(txDate.getMonth() + 1).padStart(2, "0");
          const day = String(txDate.getDate()).padStart(2, "0");
          const key = `${year}-${month}-${day}`;

          const match = points.find((p) => p.key === key);
          if (match) {
            if (isCashInflow(tx.transaction_type)) match.income += tx.amount;
            if (isCashOutflow(tx.transaction_type)) match.expense += tx.amount;
          }
        });
      }

      // Tính net cho từng điểm
      points.forEach((p) => {
        p.net = p.income - p.expense;
      });

      const tIncome = points.reduce((sum, p) => sum + p.income, 0);
      const tExpense = points.reduce((sum, p) => sum + p.expense, 0);
      const nFlow = tIncome - tExpense;

      const numDays = timeRange === "6M" ? 180 : timeRange === "7D" ? 7 : timeRange === "14D" ? 14 : 30;
      const avgDaily = Math.round(tExpense / numDays);

      let peak: AggregatedPoint | null = null;
      points.forEach((p) => {
        if (!peak || p.expense > peak.expense) {
          peak = p;
        }
      });

      const sRate = tIncome > 0 ? Math.round(((tIncome - tExpense) / tIncome) * 100) : 0;

      return {
        dataPoints: points,
        totalIncome: tIncome,
        totalExpense: tExpense,
        netFlow: nFlow,
        avgDailyExpense: avgDaily,
        peakExpensePoint: peak && (peak as AggregatedPoint).expense > 0 ? (peak as AggregatedPoint) : null,
        savingsRate: sRate,
      };
    }, [transactions, timeRange]);

  // Tìm giá trị max để scale chiều cao cột
  const maxVal = useMemo(() => {
    let m = 0;
    dataPoints.forEach((p) => {
      if (p.income > m) m = p.income;
      if (p.expense > m) m = p.expense;
    });
    return m > 0 ? m * 1.15 : 100000;
  }, [dataPoints]);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 overflow-hidden">
      {/* Header & Bộ chọn chu kỳ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Biểu đồ dòng tiền cá nhân
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            So sánh dòng tiền thu nhập và chi tiêu theo từng mốc thời gian
          </p>
        </div>

        {/* Time Horizon Segmented Control */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 self-start sm:self-auto">
          {(
            [
              { id: "7D", label: "7 Ngày" },
              { id: "14D", label: "14 Ngày" },
              { id: "30D", label: "30 Ngày" },
              { id: "6M", label: "6 Tháng" },
            ] as { id: TimeRange; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setTimeRange(item.id);
                setHoveredPoint(null);
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                timeRange === item.id
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Thanh Tóm Tắt Chu Kỳ Tinh Gọn (Gọn gàng thay vì 4 ô vuông to đùng) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-center">
        <div>
          <span className="text-[10px] text-slate-400 font-medium block">Thu chu kỳ</span>
          <span className="text-xs sm:text-sm font-bold text-emerald-600 block truncate">
            +{formatVND(totalIncome)}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-medium block">Chi chu kỳ</span>
          <span className="text-xs sm:text-sm font-bold text-rose-600 block truncate">
            -{formatVND(totalExpense)}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-medium block">Dòng tiền ròng</span>
          <span className={`text-xs sm:text-sm font-bold block truncate ${netFlow >= 0 ? "text-sky-700" : "text-rose-600"}`}>
            {netFlow >= 0 ? "+" : "-"}{formatVND(netFlow)}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-medium block">TB mỗi ngày</span>
          <span className="text-xs sm:text-sm font-bold text-slate-800 block truncate">
            ~{formatVND(avgDailyExpense)}
          </span>
        </div>
      </div>

      {/* Vùng Biểu Đồ & Chú Thích */}
      <div className="space-y-2 pt-1">
        {/* Legend & Hint */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500 inline-block"></span>
              Thu nhập
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-rose-500 inline-block"></span>
              Chi tiêu
            </span>
          </div>

          {(timeRange === "14D" || timeRange === "30D") && (
            <span className="text-[10px] text-sky-600 sm:hidden flex items-center gap-0.5">
              Vuốt ngang để xem đủ các ngày <ArrowRight className="h-3 w-3" />
            </span>
          )}
        </div>

        {/* Hover / Tap Tooltip */}
        {hoveredPoint && (
          <div className="p-2.5 bg-slate-900 text-white rounded-xl text-xs shadow-lg animate-in fade-in duration-100 flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-slate-200 text-[11px]">
              {hoveredPoint.fullDateLabel}
            </span>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="text-emerald-400">
                Thu: +{formatVND(hoveredPoint.income)}
              </span>
              <span className="text-rose-400">
                Chi: -{formatVND(hoveredPoint.expense)}
              </span>
              <span className={hoveredPoint.net >= 0 ? "text-sky-300" : "text-amber-400"}>
                Ròng: {hoveredPoint.net >= 0 ? "+" : "-"}{formatVND(hoveredPoint.net)}
              </span>
            </div>
          </div>
        )}

        {/* VÙNG CUỘN NGANG THÔNG MINH - CHỐNG VỠ LAYOUT 100% */}
        <div className="overflow-x-auto pb-1.5 scrollbar-thin">
          <div
            className={`h-48 pt-4 pb-6 px-3 border-b border-slate-200 relative flex items-end gap-1.5 sm:gap-2 ${
              timeRange === "30D"
                ? "min-w-[680px]"
                : timeRange === "14D"
                ? "min-w-[440px]"
                : "w-full min-w-0"
            }`}
          >
            {/* Đường gióng ngang mờ */}
            <div className="absolute inset-x-0 top-4 border-b border-slate-100 pointer-events-none" />
            <div className="absolute inset-x-0 top-1/2 border-b border-slate-100 pointer-events-none" />

            {dataPoints.map((point) => {
              const incomeH = maxVal > 0 ? (point.income / maxVal) * 100 : 0;
              const expenseH = maxVal > 0 ? (point.expense / maxVal) * 100 : 0;
              const isHovered = hoveredPoint?.key === point.key;

              return (
                <div
                  key={point.key}
                  onMouseEnter={() => setHoveredPoint(point)}
                  onClick={() => setHoveredPoint(point)}
                  className={`flex-1 h-full flex flex-col justify-end items-center group cursor-pointer transition-all ${
                    isHovered ? "opacity-100 scale-102" : "hover:opacity-100 opacity-90"
                  }`}
                >
                  {/* Cột kép Thu nhập & Chi tiêu */}
                  <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-full px-0.5">
                    {/* Cột Thu */}
                    <div className="w-1/2 max-w-[12px] h-full flex items-end justify-center">
                      <div
                        style={{ height: `${Math.max(incomeH, point.income > 0 ? 4 : 0)}%` }}
                        className={`w-full rounded-t-sm transition-all duration-300 ${
                          isHovered ? "bg-emerald-600 shadow-xs" : "bg-emerald-500"
                        }`}
                      />
                    </div>

                    {/* Cột Chi */}
                    <div className="w-1/2 max-w-[12px] h-full flex items-end justify-center">
                      <div
                        style={{ height: `${Math.max(expenseH, point.expense > 0 ? 4 : 0)}%` }}
                        className={`w-full rounded-t-sm transition-all duration-300 ${
                          isHovered ? "bg-rose-600 shadow-xs" : "bg-rose-500"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Nhãn mốc thời gian */}
                  <span
                    className={`text-[9px] sm:text-[10px] mt-1.5 transition-colors whitespace-nowrap text-center ${
                      isHovered
                        ? "font-bold text-slate-900"
                        : "text-slate-400 group-hover:text-slate-700"
                    }`}
                  >
                    {point.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Đánh Giá Sức Khỏe Dòng Tiền Tinh Tế */}
      <div className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2">
          {netFlow >= 0 ? (
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          )}
          <div>
            <span className="font-semibold text-slate-800 block">
              {netFlow >= 0
                ? "Dòng tiền thặng dư lành mạnh"
                : "Chi tiêu vượt mức thu nhập trong kỳ"}
            </span>
            <span className="text-[11px] text-slate-500">
              {totalIncome > 0
                ? `Tỷ lệ tiết kiệm đạt ${savingsRate}%. ${
                    savingsRate >= 20
                      ? "Bạn đang tích lũy rất tốt cho các mục tiêu tương lai."
                      : "Bạn nên theo dõi sát các khoản chi chưa thiết yếu."
                  }`
                : "Chưa ghi nhận thu nhập trong chu kỳ này."}
            </span>
          </div>
        </div>

        {peakExpensePoint && (
          <div className="text-left sm:text-right text-[11px] text-slate-500 sm:border-l sm:border-slate-200 sm:pl-3 shrink-0">
            <span className="block text-slate-400">Ngày chi nhiều nhất</span>
            <span className="font-semibold text-rose-600">
              {peakExpensePoint.label}: {formatVND(peakExpensePoint.expense)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
