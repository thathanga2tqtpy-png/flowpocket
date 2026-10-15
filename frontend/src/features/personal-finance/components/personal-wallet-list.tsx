"use client";

import React from "react";
import { Wallet as WalletIcon, Pencil } from "lucide-react";
import { Wallet } from "../types";

interface PersonalWalletListProps {
  wallets: Wallet[];
  selectedWalletId: string;
  onSelectWallet: (id: string) => void;
  onCreateWallet: () => void;
  onEditWallet: (wallet: Wallet) => void;
  formatVND: (amount: number) => string;
}

export function PersonalWalletList({
  wallets,
  selectedWalletId,
  onSelectWallet,
  onCreateWallet,
  onEditWallet,
  formatVND,
}: PersonalWalletListProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <WalletIcon className="h-3.5 w-3.5 text-slate-500" />
          <span>Ví của bạn ({wallets.length})</span>
        </span>
        <button
          onClick={onCreateWallet}
          className="text-xs text-sky-600 hover:text-sky-700 font-semibold cursor-pointer"
        >
          + Thêm ví mới
        </button>
      </div>

      {wallets.length === 0 ? (
        <div className="p-6 text-center border border-dashed border-slate-300 rounded-xl bg-slate-50/50">
          <p className="text-xs text-slate-500 mb-2">Bạn chưa có ví tài chính nào.</p>
          <button
            onClick={onCreateWallet}
            className="px-3 py-1.5 bg-sky-600 text-white text-xs font-semibold rounded-lg hover:bg-sky-700 transition cursor-pointer"
          >
            Tạo ví đầu tiên
          </button>
        </div>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible">
          {wallets.map((w) => {
            const isSelected = selectedWalletId === w.id;
            return (
              <div
                key={w.id}
                onClick={() => onSelectWallet(isSelected ? "" : w.id)}
                className={`min-w-[170px] sm:min-w-0 p-3 bg-white border rounded-xl shadow-2xs transition-all cursor-pointer shrink-0 sm:shrink relative group ${
                  isSelected
                    ? "border-sky-500 ring-2 ring-sky-100 bg-sky-50/30"
                    : "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="font-semibold text-xs text-slate-800 truncate">{w.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                      {w.bank_code || w.wallet_type}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditWallet(w);
                      }}
                      className="p-1 hover:bg-slate-200/80 rounded-md text-slate-400 hover:text-sky-600 transition cursor-pointer"
                      title="Chỉnh sửa thông tin ví"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {formatVND(w.current_balance)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

