"use client";

import React, { useState, useEffect } from "react";
import { qrPaymentService } from "./qr-service";
import { IncomingPaymentRequest } from "./types";
import { Wallet, Category } from "@/features/personal-finance/types";
import { MoneyInput } from "@/components/ui/money-input";
import {
  QrCode,
  AlertCircle,
  Building2,
  Wallet as WalletIcon,
  Tag,
  CheckCircle2,
  Edit2,
  PlusCircle,
} from "lucide-react";

interface CreateRequestTabProps {
  wallets: Wallet[];
  categories: Category[];
  onRequestCreated: (req: IncomingPaymentRequest) => void;
  onEditWallet?: (wallet: Wallet) => void;
  onCreateWallet?: () => void;
}

export function CreateRequestTab({
  wallets,
  categories,
  onRequestCreated,
  onEditWallet,
  onCreateWallet,
}: CreateRequestTabProps) {
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [transferMemo, setTransferMemo] = useState<string>("");
  const [allowFlexibleAmount, setAllowFlexibleAmount] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter only INCOME categories
  const incomeCategories = categories.filter((c) => c.kind === "INCOME");

  // Only bank wallets can receive VietQR
  const bankWallets = wallets.filter((w) => w.wallet_type === "BANK");

  // Auto select default wallet
  useEffect(() => {
    if (bankWallets.length > 0 && !selectedWalletId) {
      const preferred = bankWallets.find((w) => w.bank_code && w.account_number) || bankWallets[0];
      setSelectedWalletId(preferred.id);
    }
  }, [bankWallets, selectedWalletId]);

  const currentWallet = bankWallets.find((w) => w.id === selectedWalletId);
  const isWalletReady = Boolean(
    currentWallet && currentWallet.bank_code && currentWallet.account_number
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedWalletId || !currentWallet) {
      setError("Vui lòng chọn ví ngân hàng nhận tiền");
      return;
    }

    if (!isWalletReady) {
      setError("Ví này chưa có thông tin ngân hàng hoặc số tài khoản. Vui lòng cập nhật thông tin ví trước");
      return;
    }

    if (!amount || amount <= 0) {
      setError("Số tiền nhận phải lớn hơn 0 đ");
      return;
    }

    try {
      setSubmitting(true);
      const res = await qrPaymentService.createPaymentRequest({
        target_wallet_id: selectedWalletId,
        expected_amount: amount,
        category_id: categoryId || undefined,
        description: description.trim() || undefined,
        transfer_memo: transferMemo.trim() || undefined,
        allow_flexible_amount: allowFlexibleAmount,
      });

      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        onRequestCreated(res.data);
      }
    } catch (err: any) {
      setError(err.message || "Lỗi khi tạo yêu cầu nhận tiền");
    } finally {
      setSubmitting(false);
    }
  };

  if (bankWallets.length === 0) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl space-y-4">
        <div className="h-12 w-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
          <Building2 className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-800">Chưa có Ví Ngân hàng nào</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Để tạo mã VietQR chuẩn Napas nhận tiền, bạn cần tạo ít nhất một Ví thuộc loại Ngân hàng (kèm Số tài khoản).
          </p>
        </div>
        {onCreateWallet && (
          <div className="flex items-center justify-center pt-2">
            <button
              type="button"
              onClick={onCreateWallet}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ Tạo ví ngân hàng ngay</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Chọn Ví nhận tiền */}
      <div>
        <label className="text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <WalletIcon className="h-3.5 w-3.5 text-sky-600" />
            <span>Ví ngân hàng nhận tiền</span> <span className="text-rose-500">*</span>
          </span>
          {isWalletReady && (
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Chuẩn VietQR Napas
            </span>
          )}
        </label>
        <select
          value={selectedWalletId}
          onChange={(e) => setSelectedWalletId(e.target.value)}
          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 bg-white focus:outline-sky-500 font-medium"
          required
        >
          {bankWallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} {w.bank_code ? `[${w.bank_code}]` : ""} ({new Intl.NumberFormat("vi-VN").format(w.current_balance)} đ)
            </option>
          ))}
        </select>
      </div>

      {/* Thông tin ngân hàng của Ví được chọn */}
      {currentWallet && (
        <div>
          {isWalletReady ? (
            <div className="p-3 bg-sky-50/80 border border-sky-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-sky-900">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-sky-600" />
                  <span>Ngân hàng thụ hưởng:</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sky-800 font-bold bg-white px-2 py-0.5 rounded border border-sky-100">
                    {currentWallet.bank_name || currentWallet.bank_code}
                  </span>
                  {onEditWallet && (
                    <button
                      type="button"
                      onClick={() => onEditWallet(currentWallet)}
                      className="text-sky-600 hover:text-sky-800 text-[11px] flex items-center gap-0.5 cursor-pointer"
                      title="Sửa thông tin ví"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Sửa</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="text-xs text-slate-700 flex justify-between items-center">
                <span className="text-slate-500 text-[11px]">Số tài khoản (STK):</span>
                <span className="font-mono font-bold text-slate-900 tracking-wider">
                  {currentWallet.account_number}
                </span>
              </div>
              {currentWallet.account_holder_name && (
                <div className="text-xs text-slate-700 flex justify-between items-center">
                  <span className="text-slate-500 text-[11px]">Chủ tài khoản:</span>
                  <span className="font-semibold text-slate-900 uppercase">
                    {currentWallet.account_holder_name}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="text-xs text-amber-900 font-medium flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Ví này chưa có thông tin Ngân hàng hoặc Số tài khoản để tạo mã QR.</span>
              </div>
              {onEditWallet && (
                <button
                  type="button"
                  onClick={() => onEditWallet(currentWallet)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Cập nhật STK cho ví ngay</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. Số tiền cần nhận (MoneyInput) */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
          Số tiền cần nhận (VND) <span className="text-rose-500">*</span>
        </label>
        <MoneyInput
          value={amount}
          onChange={setAmount}
          placeholder="Nhập số tiền cần nhận"
          min={1000}
          className="border-slate-200 focus-within:ring-sky-500"
        />

        {/* Tùy chọn Số tiền gợi ý / Cho phép người chuyển sửa trên app ngân hàng */}
        <div className="mt-2 p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2.5">
          <input
            type="checkbox"
            id="allowFlexibleAmount"
            checked={allowFlexibleAmount}
            onChange={(e) => setAllowFlexibleAmount(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer shrink-0"
          />
          <label htmlFor="allowFlexibleAmount" className="text-xs text-amber-950 cursor-pointer select-none">
            <span className="font-bold block text-slate-900">
              Số tiền gợi ý (Cho phép người chuyển sửa trên app ngân hàng)
            </span>
            <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
              Số tiền sẽ được điền sẵn trên app ngân hàng của người trả nhưng họ có thể linh hoạt sửa lại (làm tròn số, típ thêm...). Hệ thống sẽ tự động ghi nhận chênh lệch khi bạn xác nhận.
            </span>
          </label>
        </div>
      </div>

      {/* 3. Danh mục thu nhập */}
      <div>
        <label className="text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 text-sky-600" />
          <span>Danh mục thu nhập</span>
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 bg-white focus:outline-sky-500 font-medium"
        >
          <option value="">Thu nhập khác (Mặc định)</option>
          {incomeCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* 4. Nội dung chuyển khoản (Memo) & Mô tả */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Nội dung chuyển khoản (Memo)
          </label>
          <input
            type="text"
            value={transferMemo}
            onChange={(e) => setTransferMemo(e.target.value)}
            placeholder="VD: Tien an trua, Quyen gop..."
            maxLength={25}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-sky-500 font-mono"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Tối đa 25 ký tự không dấu. Nếu trống, hệ thống sẽ tự sinh mã tham chiếu.
          </p>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Ghi chú nội bộ
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="VD: Nhận tiền hoàn từ Nam..."
            maxLength={100}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-sky-500"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Chỉ bạn nhìn thấy trong lịch sử giao dịch.
          </p>
        </div>
      </div>

      {/* Nút hành động */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting || !isWalletReady}
          className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
        >
          {submitting ? (
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <QrCode className="h-4 w-4" />
          )}
          <span>Tạo mã QR nhận tiền</span>
        </button>
      </div>
    </form>
  );
}
