"use client";

import React, { useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Wallet, Category } from "./types";
import { PlusCircle, X, Loader2, AlertCircle } from "lucide-react";

interface TransactionModalProps {
  isOpen: boolean;
  wallets: Wallet[];
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

export function TransactionModal({
  isOpen,
  wallets,
  categories,
  onClose,
  onSuccess,
}: TransactionModalProps) {
  const [txType, setTxType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [walletId, setWalletId] = useState(wallets[0]?.id || "");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.kind === txType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountNum = parseInt(amount.replace(/\D/g, ""), 10);
    if (!amountNum || amountNum <= 0) {
      setError("Số tiền phải lớn hơn 0 VND");
      return;
    }

    if (!walletId) {
      setError("Vui lòng chọn ví thanh toán");
      return;
    }

    setLoading(true);
    const res = await apiRequest("/api/v1/transactions", {
      method: "POST",
      body: JSON.stringify({
        wallet_id: walletId,
        transaction_type: txType,
        amount: amountNum,
        category_id: categoryId || null,
        description: description.trim() || null,
      }),
    });

    if (res.data) {
      setAmount("");
      setDescription("");
      setCategoryId("");
      onSuccess();
      onClose();
    } else {
      setError(res.error || "Không thể lưu giao dịch");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">Ghi nhận giao dịch</h3>
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
          {/* Type selector */}
          <div className="flex border border-slate-200 rounded-lg p-1 bg-slate-50 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setTxType("EXPENSE");
                setCategoryId("");
              }}
              className={`flex-1 py-1.5 rounded-md transition-all ${
                txType === "EXPENSE"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Chi tiêu (-)
            </button>
            <button
              type="button"
              onClick={() => {
                setTxType("INCOME");
                setCategoryId("");
              }}
              className={`flex-1 py-1.5 rounded-md transition-all ${
                txType === "INCOME"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Thu nhập (+)
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Số tiền (VND)
            </label>
            <input
              type="text"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ví dụ: 50.000"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chọn ví
            </label>
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
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
              Danh mục
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
            >
              <option value="">-- Chưa phân loại --</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ăn trưa, Cà phê, Xăng xe..."
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
              className={`flex items-center gap-1.5 px-4 py-2 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 ${
                txType === "EXPENSE" ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Lưu giao dịch</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

