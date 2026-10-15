"use client";

import React, { useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Wallet } from "./types";
import { ArrowLeftRight, X, Loader2, AlertCircle } from "lucide-react";
import { MoneyInput } from "@/components/ui/money-input";

interface TransferModalProps {
  isOpen: boolean;
  wallets: Wallet[];
  onClose: () => void;
  onSuccess: () => void;
}

export function TransferModal({
  isOpen,
  wallets,
  onClose,
  onSuccess,
}: TransferModalProps) {
  const [sourceWalletId, setSourceWalletId] = useState(wallets[0]?.id || "");
  const [destWalletId, setDestWalletId] = useState(wallets[1]?.id || "");
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!amount || amount <= 0) {
      setError("Số tiền chuyển phải lớn hơn 0 VND");
      return;
    }

    if (!sourceWalletId || !destWalletId) {
      setError("Vui lòng chọn cả ví nguồn và ví đích");
      return;
    }

    if (sourceWalletId === destWalletId) {
      setError("Ví nguồn và ví đích không được trùng nhau");
      return;
    }

    setLoading(true);
    const res = await apiRequest("/api/v1/transactions/transfer", {
      method: "POST",
      body: JSON.stringify({
        source_wallet_id: sourceWalletId,
        destination_wallet_id: destWalletId,
        amount: amount,
        description: description.trim() || null,
      }),
    });

    if (res.data) {
      setAmount(0);
      setDescription("");
      onSuccess();
      onClose();
    } else {
      setError(res.error || "Không thể thực hiện chuyển tiền");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <ArrowLeftRight className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Chuyển tiền giữa các ví</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2.5 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Nhập số tiền chuyển */}
          <MoneyInput
            id="transfer-amount"
            label="Số tiền chuyển (VND)"
            required
            placeholder="0"
            value={amount}
            onChange={(val) => setAmount(val)}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Từ ví (Ví nguồn)
            </label>
            <select
              value={sourceWalletId}
              onChange={(e) => setSourceWalletId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.current_balance.toLocaleString("vi-VN")} đ)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Đến ví (Ví nhận)
            </label>
            <select
              value={destWalletId}
              onChange={(e) => setDestWalletId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
            >
              {wallets
                .filter((w) => w.id !== sourceWalletId)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.current_balance.toLocaleString("vi-VN")} đ)
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú chuyển tiền
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Rút tiền ATM, Nạp tiền ví MoMo..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Đang chuyển...</span>
                </>
              ) : (
                <>
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  <span>Xác nhận chuyển</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

