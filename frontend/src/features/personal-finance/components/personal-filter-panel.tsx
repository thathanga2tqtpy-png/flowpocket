"use client";

import React from "react";
import { Filter, RotateCcw } from "lucide-react";
import { Wallet, Category } from "../types";

interface PersonalFilterPanelProps {
  datePreset: "ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "LAST_MONTH" | "CUSTOM";
  fromDate: string;
  toDate: string;
  onPresetChange: (preset: "ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "LAST_MONTH" | "CUSTOM") => void;
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;
  selectedWalletId: string;
  onWalletChange: (id: string) => void;
  wallets: Wallet[];
  selectedSource: string;
  onSourceChange: (source: string) => void;
  selectedGroupName: string;
  onGroupNameChange: (name: string) => void;
  groups: { id: string; name: string }[];
  selectedType: string;
  onTypeChange: (type: string) => void;
  selectedCategoryId: string;
  onCategoryChange: (id: string) => void;
  categories: Category[];
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  formatVND: (amount: number) => string;
}

export function PersonalFilterPanel({
  datePreset,
  fromDate,
  toDate,
  onPresetChange,
  onFromDateChange,
  onToDateChange,
  selectedWalletId,
  onWalletChange,
  wallets,
  selectedSource,
  onSourceChange,
  selectedGroupName,
  onGroupNameChange,
  groups,
  selectedType,
  onTypeChange,
  selectedCategoryId,
  onCategoryChange,
  categories,
  hasActiveFilters,
  onResetFilters,
  formatVND,
}: PersonalFilterPanelProps) {
  return (
    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3.5 animate-in fade-in duration-150">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-sky-600" />
          Bộ lọc nâng cao
        </span>
        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            Đặt lại
          </button>
        )}
      </div>

      {/* Time Presets */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
          Thời gian
        </label>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: "Tất cả", val: "ALL" },
            { label: "Hôm nay", val: "TODAY" },
            { label: "Tuần này", val: "THIS_WEEK" },
            { label: "Tháng này", val: "THIS_MONTH" },
            { label: "Tháng trước", val: "LAST_MONTH" },
            { label: "Tùy chọn", val: "CUSTOM" },
          ].map((p) => (
            <button
              key={p.val}
              type="button"
              onClick={() => onPresetChange(p.val as any)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                datePreset === p.val
                  ? "bg-sky-600 text-white font-semibold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range */}
        {datePreset === "CUSTOM" && (
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">Từ ngày</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => onFromDateChange(e.target.value)}
                className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-800 bg-white"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">Đến ngày</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => onToDateChange(e.target.value)}
                className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-800 bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Dropdown Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Lọc theo ví
          </label>
          <select
            value={selectedWalletId}
            onChange={(e) => onWalletChange(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800 bg-white"
          >
            <option value="">-- Tất cả ví --</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({formatVND(w.current_balance)})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Nguồn giao dịch
          </label>
          <select
            value={selectedSource}
            onChange={(e) => onSourceChange(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800 bg-white"
          >
            <option value="">-- Tất cả nguồn --</option>
            <option value="PERSONAL">Chỉ chi tiêu cá nhân</option>
            <option value="GROUP">Giao dịch từ nhóm</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Lọc theo nhóm
          </label>
          <select
            value={selectedGroupName}
            onChange={(e) => onGroupNameChange(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800 bg-white"
          >
            <option value="">-- Tất cả nhóm --</option>
            {groups.map((g) => (
              <option key={g.id} value={g.name}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Lọc theo loại
          </label>
          <select
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800 bg-white"
          >
            <option value="">-- Tất cả loại --</option>
            <option value="EXPENSE">Chi tiêu (-)</option>
            <option value="INCOME">Thu nhập (+)</option>
            <option value="TRANSFER_OUT">Chuyển đi (-)</option>
            <option value="TRANSFER_IN">Chuyển đến (+)</option>
            <option value="GROUP_SETTLEMENT_PAID">Trả nợ nhóm (-)</option>
            <option value="GROUP_SETTLEMENT_RECEIVED">Nhận hoàn nợ (+)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Lọc theo danh mục
          </label>
          <select
            value={selectedCategoryId}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800 bg-white"
          >
            <option value="">-- Tất cả danh mục --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.kind === "EXPENSE" ? "[-] " : "[+] "}
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

