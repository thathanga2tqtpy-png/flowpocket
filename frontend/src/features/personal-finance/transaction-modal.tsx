"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api-client";
import { Wallet, Category } from "./types";
import {
  X,
  Loader2,
  AlertCircle,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  Tag,
  Wallet as WalletIcon,
  Calendar,
} from "lucide-react";
import { MoneyInput } from "@/components/ui/money-input";

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
  const getNowLocalString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  };

  const [txType, setTxType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [walletId, setWalletId] = useState(wallets[0]?.id || "");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState<string>(getNowLocalString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Đồng bộ ví mặc định khi mở modal
  useEffect(() => {
    if (wallets.length > 0 && (!walletId || !wallets.find((w) => w.id === walletId))) {
      setWalletId(wallets[0].id);
    }
  }, [wallets, walletId]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.kind === txType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!amount || amount <= 0) {
      setError("Số tiền phải lớn hơn 0 VND");
      return;
    }
    if (!walletId) {
      setError("Vui lòng chọn ví thanh toán");
      return;
    }

    setLoading(true);
    const txDateIso = transactionDate ? new Date(transactionDate).toISOString() : new Date().toISOString();

    const res = await apiRequest("/api/v1/transactions", {
      method: "POST",
      body: JSON.stringify({
        wallet_id: walletId,
        transaction_type: txType,
        amount: amount,
        category_id: categoryId || null,
        description: description.trim() || null,
        transaction_date: txDateIso,
      }),
    });

    setLoading(false);
    if (res.data) {
      setAmount(0);
      setDescription("");
      setCategoryId("");
      setTransactionDate(getNowLocalString());
      onSuccess();
      onClose();
    } else {
      setError(res.error || "Không thể lưu giao dịch cá nhân");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-800">Ghi nhận giao dịch cá nhân</h3>
            <p className="text-xs text-slate-500">
              Quản lý dòng tiền thu và chi cho riêng bạn
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 p-2.5 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-xl">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Switcher Thu nhập vs Chi tiêu */}
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setTxType("EXPENSE");
                setCategoryId("");
              }}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                txType === "EXPENSE"
                  ? "bg-white text-rose-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <TrendingDown className="h-4 w-4" />
              <span>Chi tiêu (-)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTxType("INCOME");
                setCategoryId("");
              }}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                txType === "INCOME"
                  ? "bg-white text-emerald-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Thu nhập (+)</span>
            </button>
          </div>

          {/* Ô nhập số tiền thông minh */}
          <MoneyInput
            id="personal-tx-amount"
            label="Số tiền (VND)"
            required
            placeholder="0"
            value={amount}
            onChange={(val) => setAmount(val)}
          />

          {/* Chọn ví nguồn */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <WalletIcon className="h-3.5 w-3.5 text-slate-500" />
              <span>Ví giao dịch <span className="text-rose-500">*</span></span>
            </label>
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-900 font-medium"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.current_balance.toLocaleString("vi-VN")} đ)
                </option>
              ))}
            </select>
          </div>

          {/* Chọn danh mục */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-slate-500" />
              <span>Danh mục phân loại</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-900"
            >
              <option value="">-- Không phân loại --</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mô tả / Ghi chú */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú / Diễn giải
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Cà phê sáng, Đổ xăng xe, Mua sách..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-900"
            />
          </div>

          {/* Ngày giờ giao dịch */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span>Thời gian giao dịch</span>
              </label>
              <button
                type="button"
                onClick={() => setTransactionDate(getNowLocalString())}
                className="text-[11px] text-sky-600 hover:text-sky-700 font-semibold cursor-pointer"
              >
                Bây giờ
              </button>
            </div>
            <input
              type="datetime-local"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-900"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
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
