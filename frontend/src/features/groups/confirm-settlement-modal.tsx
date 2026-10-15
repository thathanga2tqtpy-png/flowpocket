"use client";

import React, { useState, useEffect } from "react";
import { groupService } from "./group-service";
import { personalFinanceService } from "@/features/personal-finance/personal-finance-service";
import { GroupSettlement } from "./types";
import { Wallet as WalletType } from "@/features/personal-finance/types";
import { Check, X, AlertCircle, Loader2 } from "lucide-react";

interface ConfirmSettlementModalProps {
  isOpen: boolean;
  groupId: string;
  settlement: GroupSettlement | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ConfirmSettlementModal({
  isOpen,
  groupId,
  settlement,
  onClose,
  onSuccess,
}: ConfirmSettlementModalProps) {
  const [userWallets, setUserWallets] = useState<WalletType[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      personalFinanceService.getWallets().then((res) => {
        if (res.data && res.data.length > 0) {
          setUserWallets(res.data);
          setSelectedWalletId(res.data[0].id);
        } else {
          setUserWallets([]);
          setSelectedWalletId("");
        }
      });
    }
  }, [isOpen]);

  if (!isOpen || !settlement) return null;

  const handleConfirm = async () => {
    if (userWallets.length > 0 && !selectedWalletId) {
      setError("Vui lòng chọn ví nhận tiền để hoàn tất quyết toán.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      recipient_wallet_id: selectedWalletId || undefined,
    };

    const res = await groupService.confirmSettlement(groupId, settlement.id, payload);

    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm p-5 shadow-xl text-slate-800 space-y-3.5">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <h3 className="text-sm font-bold flex items-center gap-1.5 text-slate-900">
            <Check className="h-4 w-4 text-emerald-600" />
            Xác nhận nhận tiền
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
          <p className="text-xs text-slate-600">
            Thành viên <strong>{settlement.from_user_name}</strong> đã chuyển:
          </p>
          <p className="text-base font-bold text-slate-900">
            {settlement.amount.toLocaleString("vi-VN")} đ
          </p>
          {settlement.note && (
            <p className="text-[11px] text-slate-500 italic">"{settlement.note}"</p>
          )}
        </div>

        {/* Bắt buộc chọn ví cá nhân để nhận tiền hoàn nợ */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Chọn ví nhận tiền <span className="text-rose-500">*</span>
          </label>
          {userWallets.length > 0 ? (
            <select
              value={selectedWalletId}
              onChange={(e) => setSelectedWalletId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {userWallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (Số dư hiện tại: {w.current_balance.toLocaleString("vi-VN")} đ)
                </option>
              ))}
            </select>
          ) : (
            <div className="text-xs text-slate-500 p-2 bg-slate-50 rounded-lg border border-slate-200">
              Đang chuẩn bị ví Tiền mặt mặc định cho bạn...
            </div>
          )}
          <p className="text-[11px] text-slate-400 mt-1">
            Số tiền này sẽ được cộng vào ví và tự động khấu trừ chi phí nhóm (Net Expense) của bạn.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Đang ghi nhận...</span>
              </>
            ) : (
              <span>Xác nhận đã nhận</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
