"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api-client";
import { Wallet as WalletIcon, Plus, X, Loader2, AlertCircle, Building2, Pencil, Check } from "lucide-react";
import { MoneyInput } from "@/components/ui/money-input";
import { qrPaymentService } from "@/features/qr-payments/qr-service";
import { SupportedBank } from "@/features/qr-payments/types";
import { Wallet } from "./types";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  walletToEdit?: Wallet | null;
}

export function WalletModal({ isOpen, onClose, onSuccess, walletToEdit }: WalletModalProps) {
  const [name, setName] = useState("");
  const [walletType, setWalletType] = useState("CASH");
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [banks, setBanks] = useState<SupportedBank[]>([]);
  const [bankCode, setBankCode] = useState("VCB");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load supported banks list
  useEffect(() => {
    if (isOpen && banks.length === 0) {
      qrPaymentService.getSupportedBanks().then((res) => {
        if (res.data && res.data.length > 0) {
          setBanks(res.data);
          if (!walletToEdit?.bank_code) {
            setBankCode(res.data[0].code);
          }
        }
      });
    }
  }, [isOpen, banks.length, walletToEdit]);

  // Populate data when editing or reset when creating
  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (walletToEdit) {
        setName(walletToEdit.name);
        setWalletType(walletToEdit.wallet_type);
        setOpeningBalance(walletToEdit.opening_balance);
        setBankCode(walletToEdit.bank_code || "VCB");
        setAccountNumber(walletToEdit.account_number || "");
        setAccountHolderName(walletToEdit.account_holder_name || "");
      } else {
        setName("");
        setWalletType("CASH");
        setOpeningBalance(0);
        setBankCode(banks.length > 0 ? banks[0].code : "VCB");
        setAccountNumber("");
        setAccountHolderName("");
      }
    }
  }, [isOpen, walletToEdit, banks]);

  if (!isOpen) return null;

  const isEditing = Boolean(walletToEdit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Vui lòng nhập tên ví");
      return;
    }

    if (walletType === "BANK") {
      if (!accountNumber.trim()) {
        setError("Vui lòng nhập số tài khoản ngân hàng");
        return;
      }
      if (!accountHolderName.trim()) {
        setError("Vui lòng nhập tên chủ tài khoản");
        return;
      }
    }

    setLoading(true);

    const selectedBank = banks.find((b) => b.code === bankCode);

    const payload = {
      name: name.trim(),
      wallet_type: walletType,
      ...(isEditing ? {} : { opening_balance: openingBalance || 0, currency: "VND" }),
      bank_code: walletType === "BANK" ? bankCode : null,
      bank_name: walletType === "BANK" ? (selectedBank ? selectedBank.name : bankCode) : null,
      account_number: walletType === "BANK" ? accountNumber.trim() : null,
      account_holder_name: walletType === "BANK" ? accountHolderName.trim().toUpperCase() : null,
    };

    const res = isEditing
      ? await apiRequest(`/api/v1/wallets/${walletToEdit!.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await apiRequest("/api/v1/wallets", {
          method: "POST",
          body: JSON.stringify(payload),
        });

    if (res.data) {
      onSuccess();
      onClose();
    } else {
      setError(res.error || (isEditing ? "Không thể cập nhật ví" : "Không thể tạo ví mới"));
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold ${
                isEditing ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
              }`}
            >
              {isEditing ? <Pencil className="h-4 w-4" /> : <WalletIcon className="h-4 w-4" />}
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {isEditing ? "Chỉnh sửa thông tin ví" : "Thêm ví tài chính"}
            </h3>
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tên ví / Tài khoản
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Tiền mặt, Techcombank, MBBank"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Loại ví
            </label>
            <select
              value={walletType}
              onChange={(e) => setWalletType(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 font-medium"
            >
              <option value="CASH">Tiền mặt (CASH)</option>
              <option value="BANK">Tài khoản Ngân hàng (BANK)</option>
              <option value="E_WALLET">Ví điện tử (E-WALLET)</option>
              <option value="OTHER">Khác (OTHER)</option>
            </select>
          </div>

          {/* Cấu hình tài khoản ngân hàng tích hợp nếu là BANK */}
          {walletType === "BANK" && (
            <div className="p-3.5 bg-sky-50/70 border border-sky-100 rounded-xl space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-800">
                <Building2 className="h-4 w-4 text-sky-600" />
                <span>Thông tin ngân hàng nhận tiền (VietQR)</span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Ngân hàng thụ hưởng
                </label>
                <select
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 font-medium"
                >
                  {banks.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.short_name} - {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Số tài khoản (STK)
                  </label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\s+/g, ""))}
                    placeholder="VD: 0011004321..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Tên chủ tài khoản
                  </label>
                  <input
                    type="text"
                    required
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value.toUpperCase())}
                    placeholder="VD: NGUYEN VAN A"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 uppercase font-medium"
                  />
                </div>
              </div>
              <p className="text-[11px] text-sky-700/80 italic">
                * Khi quét QR chi tiền từ ví này, hệ thống sẽ tự động mở đúng App ngân hàng này để bạn thanh toán.
              </p>
            </div>
          )}

          {/* Nhập số dư ban đầu (chỉ khi tạo mới) */}
          {!isEditing && (
            <MoneyInput
              id="wallet-opening-balance"
              label="Số dư ban đầu (VND)"
              placeholder="0"
              value={openingBalance}
              onChange={(val) => setOpeningBalance(val)}
            />
          )}

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
                isEditing ? "bg-amber-600 hover:bg-amber-700" : "bg-sky-600 hover:bg-sky-700"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : isEditing ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Lưu thay đổi</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tạo ví</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
