"use client";

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Scan,
  QrCode,
  ArrowLeftRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { FinancialSummary } from "../types";

interface PersonalAssetBannerProps {
  summary: FinancialSummary | null;
  pendingExpensesCount: number;
  onOpenTxModal: () => void;
  onOpenQrScanner: () => void;
  onOpenQrModal: () => void;
  onOpenTransferModal: () => void;
  formatVND: (amount: number) => string;
  isAllHidden?: boolean;
  onToggleAllHidden?: () => void;
  isTotalRevealed?: boolean;
  onToggleTotalRevealed?: () => void;
}

export function PersonalAssetBanner({
  summary,
  pendingExpensesCount,
  onOpenTxModal,
  onOpenQrScanner,
  onOpenQrModal,
  onOpenTransferModal,
  formatVND,
  isAllHidden = false,
  onToggleAllHidden,
  isTotalRevealed = false,
  onToggleTotalRevealed,
}: PersonalAssetBannerProps) {
  const walletsCount = summary?.wallets.length || 0;
  // Số dư tổng được hiển thị khi không ở chế độ ẩn toàn bộ HOẶC người dùng bấm riêng con mắt để xem
  const showTotal = !isAllHidden || isTotalRevealed;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Asset Headline Numbers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Tổng tài sản khả dụng
            </span>
            {onToggleTotalRevealed && (
              <button
                type="button"
                onClick={onToggleTotalRevealed}
                className="p-1 -m-1 text-slate-400 hover:text-slate-600 rounded-md transition cursor-pointer"
                title={showTotal ? "Ẩn tổng số dư" : "Hiện tổng số dư"}
                aria-label={showTotal ? "Ẩn tổng số dư" : "Hiện tổng số dư"}
              >
                {showTotal ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            )}
            {onToggleAllHidden && (
              <button
                type="button"
                onClick={onToggleAllHidden}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition cursor-pointer flex items-center gap-1 ${
                  isAllHidden
                    ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                    : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                }`}
                title={isAllHidden ? "Bấm để hiện nhanh toàn bộ số dư ví" : "Bấm để ẩn nhanh toàn bộ số dư ví"}
              >
                {isAllHidden ? (
                  <>
                    <Eye className="h-3 w-3" />
                    <span>Hiện tất cả</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3 w-3" />
                    <span>Ẩn tất cả</span>
                  </>
                )}
              </button>
            )}
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight block">
            {showTotal ? (summary ? formatVND(summary.total_assets) : "0 đ") : "•••••••• đ"}
          </span>
          <div className="flex items-center gap-2.5 text-xs font-semibold mt-1.5 flex-wrap">
            <span className="text-emerald-600 flex items-center gap-1 whitespace-nowrap">
              <TrendingUp className="h-3.5 w-3.5" /> Thu: {showTotal ? `+${summary ? formatVND(summary.total_income) : "0 đ"}` : "••••••"}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-rose-600 flex items-center gap-1 whitespace-nowrap">
              <TrendingDown className="h-3.5 w-3.5" /> Chi: {showTotal ? `-${summary ? formatVND(summary.total_expense) : "0 đ"}` : "••••••"}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100">
        {/* 1. Ghi thu chi */}
        <button
          type="button"
          onClick={onOpenTxModal}
          disabled={!walletsCount}
          className="group flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50/80 hover:bg-sky-50/90 border border-slate-200/60 hover:border-sky-200 transition-all disabled:opacity-40 cursor-pointer text-center"
        >
          <div className="h-9 w-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
            <Plus className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-800 mt-1.5 whitespace-nowrap block">
            Ghi thu/chi
          </span>
        </button>

        {/* 2. Quét QR */}
        <button
          type="button"
          onClick={onOpenQrScanner}
          disabled={!walletsCount}
          className="group relative flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50/80 hover:bg-indigo-50/90 border border-slate-200/60 hover:border-indigo-200 transition-all disabled:opacity-40 cursor-pointer text-center"
        >
          <div className="relative h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
            <Scan className="h-4.5 w-4.5" />
            {pendingExpensesCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-amber-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-xs animate-pulse">
                {pendingExpensesCount}
              </span>
            )}
          </div>
          <span className="text-[11px] font-bold text-slate-800 mt-1.5 whitespace-nowrap block">
            Quét QR
          </span>
        </button>

        {/* 3. Nhận QR */}
        <button
          type="button"
          onClick={onOpenQrModal}
          disabled={!walletsCount}
          className="group flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50/80 hover:bg-emerald-50/90 border border-slate-200/60 hover:border-emerald-200 transition-all disabled:opacity-40 cursor-pointer text-center"
        >
          <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
            <QrCode className="h-4.5 w-4.5" />
          </div>
          <span className="text-[11px] font-bold text-slate-800 mt-1.5 whitespace-nowrap block">
            Nhận QR
          </span>
        </button>

        {/* 4. Chuyển ví */}
        <button
          type="button"
          onClick={onOpenTransferModal}
          disabled={walletsCount < 2}
          className="group flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/60 hover:border-slate-300 transition-all disabled:opacity-40 cursor-pointer text-center"
        >
          <div className="h-9 w-9 rounded-xl bg-slate-700 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
            <ArrowLeftRight className="h-4.5 w-4.5" />
          </div>
          <span className="text-[11px] font-bold text-slate-800 mt-1.5 whitespace-nowrap block">
            Chuyển ví
          </span>
        </button>
      </div>
    </div>
  );
}

