"use client";

import React, { useState } from "react";
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Wallet as WalletIcon,
  Tag,
  CheckCircle2,
  ExternalLink,
  Clock,
} from "lucide-react";
import { ParsedVietQR } from "../vietqr-parser";
import { Wallet, Category } from "@/features/personal-finance/types";
import { MoneyInput } from "@/components/ui/money-input";
import { qrPaymentService } from "../qr-service";
import { POPULAR_BANK_APPS, openBankAppByScheme } from "../bank-deeplinks";

interface QRExpenseFormProps {
  parsedResult: ParsedVietQR;
  eligibleWallets: Wallet[];
  categories: Category[];
  selectedWalletId: string;
  onSelectWallet: (id: string) => void;
  onScanAgain: () => void;
  onSuccess: () => void;
  onClose: () => void;
  formatVND: (v: number) => string;
}

export function QRExpenseForm({
  parsedResult,
  eligibleWallets,
  categories,
  selectedWalletId,
  onSelectWallet,
  onScanAgain,
  onSuccess,
  onClose,
  formatVND,
}: QRExpenseFormProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [expenseAmount, setExpenseAmount] = useState<number>(parsedResult.amount || 0);
  const [expenseDescription, setExpenseDescription] = useState<string>(
    parsedResult.memo ? `Chi: ${parsedResult.memo}` : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const expenseCategories = categories.filter((c) => c.kind === "EXPENSE");
  const selectedWallet = eligibleWallets.find((w) => w.id === selectedWalletId);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSavePendingAndOpenBank = async () => {
    setError(null);

    if (!selectedWalletId) {
      setError("Vui lòng chọn ví để chi trả");
      return;
    }
    if (!expenseAmount || expenseAmount <= 0) {
      setError("Số tiền chi phải lớn hơn 0 đ");
      return;
    }

    try {
      setSubmitting(true);
      const res = await qrPaymentService.createOutgoingPayment({
        wallet_id: selectedWalletId,
        category_id: selectedCategoryId || null,
        amount: expenseAmount,
        description:
          expenseDescription.trim() ||
          `Chi quét QR: ${parsedResult?.bankName || parsedResult?.bankCode || "VietQR"}`,
        bank_code: parsedResult?.bankCode || undefined,
        bank_name: parsedResult?.bankName || undefined,
        account_number: parsedResult?.accountNumber || undefined,
        qr_payload: parsedResult?.rawPayload || undefined,
      });

      if (res.error) {
        setError(res.error);
        setSubmitting(false);
        return;
      }

      if (parsedResult.accountNumber) {
        try {
          await navigator.clipboard.writeText(parsedResult.accountNumber);
        } catch {}
      }

      const walletBankCode = selectedWallet?.bank_code?.toUpperCase() || "";
      const bankConfig = POPULAR_BANK_APPS.find(
        (b) => b.code.toUpperCase() === walletBankCode
      );

      setSuccessMessage(
        bankConfig
          ? `Đã lưu chờ xác nhận! Đang mở App ${bankConfig.name}...`
          : "Đã lưu khoản chi ở trạng thái Chờ xác nhận (Pending)!"
      );
      setSuccess(true);
      onSuccess();

      if (bankConfig) {
        setTimeout(() => {
          openBankAppByScheme(bankConfig, {
            bankCode: parsedResult.bankCode,
            bankBin: parsedResult.bankBin,
            accountNumber: parsedResult.accountNumber,
            amount: expenseAmount,
            memo: expenseDescription.trim() || parsedResult.memo,
          });
        }, 300);
      }

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Lỗi khi lưu khoản chi chờ xác nhận");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePendingOnly = async () => {
    setError(null);

    if (!selectedWalletId) {
      setError("Vui lòng chọn ví để chi trả");
      return;
    }
    if (!expenseAmount || expenseAmount <= 0) {
      setError("Số tiền chi phải lớn hơn 0 đ");
      return;
    }

    try {
      setSubmitting(true);
      const res = await qrPaymentService.createOutgoingPayment({
        wallet_id: selectedWalletId,
        category_id: selectedCategoryId || null,
        amount: expenseAmount,
        description:
          expenseDescription.trim() ||
          `Chi quét QR: ${parsedResult?.bankName || parsedResult?.bankCode || "VietQR"}`,
        bank_code: parsedResult?.bankCode || undefined,
        bank_name: parsedResult?.bankName || undefined,
        account_number: parsedResult?.accountNumber || undefined,
        qr_payload: parsedResult?.rawPayload || undefined,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setSuccessMessage(
          "Đã lưu khoản chi ở trạng thái Chờ xác nhận (Pending)! Cuối ngày bạn chỉ cần bấm dấu tick là xong."
        );
        setSuccess(true);
        onSuccess();
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || "Lỗi khi lưu khoản chi chờ xác nhận");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header result */}
      <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-2xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            {parsedResult.isValidVietQR
              ? "Đã nhận diện mã VietQR Napas"
              : "Đã đọc nội dung mã QR"}
          </span>
          <button
            type="button"
            onClick={onScanAgain}
            className="text-[11px] text-indigo-700 hover:text-indigo-900 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            Quét lại
          </button>
        </div>

        {/* Bóc tách ngân hàng & STK */}
        <div className="p-3 bg-white rounded-xl border border-indigo-100 text-xs space-y-1.5 shadow-2xs">
          {parsedResult.bankName && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Ngân hàng thụ hưởng:</span>
              <span className="font-bold text-slate-900">
                {parsedResult.bankName} ({parsedResult.bankCode})
              </span>
            </div>
          )}

          {parsedResult.accountNumber && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Số tài khoản:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-slate-900">
                  {parsedResult.accountNumber}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(parsedResult.accountNumber!, "account")}
                  className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                  title="Sao chép STK"
                >
                  {copiedField === "account" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          )}

          {parsedResult.amount && (
            <div className="flex justify-between items-center pt-1 border-t border-slate-100">
              <span className="text-slate-500">Số tiền trong QR:</span>
              <span className="font-bold text-rose-600 text-sm">
                {formatVND(parsedResult.amount)}
              </span>
            </div>
          )}

          {parsedResult.memo && (
            <div className="flex justify-between items-center pt-1 border-t border-slate-100">
              <span className="text-slate-500">Nội dung chuyển:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-semibold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  {parsedResult.memo}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(parsedResult.memo!, "memo")}
                  className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                  title="Sao chép nội dung"
                >
                  {copiedField === "memo" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Form Ghi nhận Chi Tiêu */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSavePendingAndOpenBank();
        }}
        className="space-y-3.5 pt-1"
      >
        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <WalletIcon className="h-4 w-4 text-emerald-600" />
          <span>Xác nhận thông tin chi tiêu ví FlowPocket</span>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage || "Đã lưu khoản chi chờ xác nhận thành công!"}</span>
          </div>
        )}

        {/* Chọn ví chi */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Chọn ví chi trả (Ngân hàng / Ví điện tử) <span className="text-rose-500">*</span>
          </label>
          {eligibleWallets.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
              Bạn chưa có ví Ngân hàng hoặc Ví điện tử nào. Vui lòng tạo mới hoặc chỉnh sửa ví hiện có sang loại Ngân hàng (BANK).
            </div>
          ) : (
            <select
              value={selectedWalletId}
              onChange={(e) => onSelectWallet(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 bg-white focus:outline-indigo-500 font-medium"
              required
            >
              {eligibleWallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.bank_code ? `[${w.bank_code}]` : `[${w.wallet_type}]`} ({formatVND(w.current_balance)})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Nhập số tiền chi */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Số tiền chi trả (VND) <span className="text-rose-500">*</span>
          </label>
          <MoneyInput
            value={expenseAmount}
            onChange={setExpenseAmount}
            placeholder="Nhập số tiền đã chuyển"
            min={1000}
            className="border-slate-200 focus-within:ring-indigo-500"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Số tiền này sẽ được lưu ở trạng thái Chờ xác nhận (Pending). Nếu bạn chuyển khoản số tiền chẵn hoặc có chênh lệch, hệ thống sẽ đối soát khi bạn xác nhận sau.
          </p>
        </div>

        {/* Chọn danh mục chi tiêu */}
        <div>
          <label className="text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-slate-500" />
            <span>Danh mục chi tiêu</span>
          </label>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 bg-white focus:outline-indigo-500"
          >
            <option value="">Chi tiêu khác / Chưa phân loại (Mặc định)</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Ghi chú chi tiêu */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Ghi chú chi tiêu
          </label>
          <input
            type="text"
            value={expenseDescription}
            onChange={(e) => setExpenseDescription(e.target.value)}
            placeholder="VD: Cà phê sáng, Mua tạp hóa..."
            maxLength={100}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-indigo-500"
          />
        </div>

        {/* Nút hành động */}
        <div className="pt-2 space-y-2">
          <button
            type="submit"
            disabled={submitting || !selectedWalletId || expenseAmount <= 0}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            <span>
              {selectedWallet?.bank_code
                ? `Lưu chờ xác nhận & Mở App ${selectedWallet.bank_code}`
                : "Lưu chờ xác nhận & Mở App Ngân hàng"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleSavePendingOnly}
            disabled={submitting || !selectedWalletId || expenseAmount <= 0}
            className="w-full py-2 px-3 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>Chỉ lưu chờ xác nhận (không mở app bank)</span>
          </button>
        </div>
      </form>
    </div>
  );
}

