"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api-client";
import { GroupMemberItem } from "./types";
import { Wallet as WalletType } from "@/features/personal-finance/types";
import { ArrowLeftRight, X, AlertCircle, Wallet as WalletIcon, Loader2 } from "lucide-react";
import { MoneyInput } from "@/components/ui/money-input";

interface SettlementModalProps {
  isOpen: boolean;
  groupId: string;
  members: GroupMemberItem[];
  currentUserId?: string;
  currentUserNet?: number;
  defaultToUserId?: string;
  defaultAmount?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function SettlementModal({
  isOpen,
  groupId,
  members,
  currentUserId,
  currentUserNet,
  defaultToUserId,
  defaultAmount,
  onClose,
  onSuccess,
}: SettlementModalProps) {
  const otherMembers = members.filter((m) => m.user_id !== currentUserId);

  const [toUserId, setToUserId] = useState<string>(
    defaultToUserId || otherMembers[0]?.user_id || ""
  );
  const [amount, setAmount] = useState<number>(defaultAmount || 0);
  const [note, setNote] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Personal wallet deduction state
  const [userWallets, setUserWallets] = useState<WalletType[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const [walletLoading, setWalletLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      if (defaultToUserId) setToUserId(defaultToUserId);
      if (defaultAmount) setAmount(defaultAmount);

      setWalletLoading(true);
      apiRequest<WalletType[]>("/api/v1/wallets").then((res) => {
        setWalletLoading(false);
        if (res.data && res.data.length > 0) {
          setUserWallets(res.data);
          setSelectedWalletId(res.data[0].id);
        } else {
          setUserWallets([]);
          setSelectedWalletId("");
        }
      });
    }
  }, [isOpen, defaultToUserId, defaultAmount]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userWallets.length === 0) {
      setError("Bạn chưa cài đặt ví cá nhân. Vui lòng vào mục 'Cá nhân' để tạo ví trước.");
      return;
    }
    if (!selectedWalletId) {
      setError("Vui lòng chọn ví cá nhân để trừ tiền.");
      return;
    }
    if (!toUserId) {
      setError("Vui lòng chọn người nhận tiền.");
      return;
    }
    if (amount <= 0) {
      setError("Số tiền phải lớn hơn 0 đ.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      to_user_id: toUserId,
      amount,
      note: note.trim() || undefined,
      payer_wallet_id: selectedWalletId,
    };

    const res = await apiRequest(`/api/v1/groups/${groupId}/settlements`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setAmount(0);
      setNote("");
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-5 shadow-xl text-slate-800 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900">
              <ArrowLeftRight className="h-4 w-4 text-slate-600" />
              Chuyển tiền trả nợ
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Số tiền sẽ được trừ trực tiếp từ ví cá nhân của bạn
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Warning if user is actually a creditor */}
        {currentUserNet !== undefined && currentUserNet > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>Bạn đang có số dư được nhận lại (+{currentUserNet.toLocaleString("vi-VN")} đ)</span>
            </div>
            <p className="text-amber-700 leading-relaxed">
              Bạn không nợ tiền trong nhóm này. Biểu mẫu này dùng khi bạn muốn chuyển tiền cho thành viên khác. Nếu bạn đang chờ nhận tiền, vui lòng đóng cửa sổ này và đợi người nợ chuyển tiền.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Người nhận tiền <span className="text-rose-500">*</span>
            </label>
            <select
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              {otherMembers.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user_full_name || m.display_name || m.user_email || m.email}
                </option>
              ))}
            </select>
          </div>

          {/* Nhập số tiền chuyển trả quyết toán */}
          <MoneyInput
            id="settlement-amount"
            label="Số tiền chuyển trả (VND)"
            required
            placeholder="0"
            value={amount}
            onChange={(val) => setAmount(val)}
          />

          {/* Trừ vào ví cá nhân */}
          {walletLoading ? (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Đang kiểm tra ví cá nhân...</span>
            </div>
          ) : userWallets.length === 0 ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                <span>Bạn chưa có ví cá nhân</span>
              </div>
              <p>
                Vui lòng vào trang "Cá nhân" để tạo ví trước khi thực hiện chuyển tiền trả nợ.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trừ từ ví cá nhân <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedWalletId}
                onChange={(e) => setSelectedWalletId(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                {userWallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} (Số dư: {w.current_balance.toLocaleString("vi-VN")} đ)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Chuyển khoản VCB, Momo, tiền mặt..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            Khoản trả nợ sẽ ở trạng thái chờ người nhận xác nhận trước khi hoàn tất.
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
              type="submit"
              disabled={loading || walletLoading || userWallets.length === 0}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : userWallets.length === 0 ? (
                <span>Cần tạo ví cá nhân trước</span>
              ) : (
                <span>Xác nhận chuyển {amount > 0 ? `${amount.toLocaleString("vi-VN")} đ` : ""}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
