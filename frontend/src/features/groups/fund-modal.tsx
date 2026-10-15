"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api-client";
import { GroupFund } from "./types";
import { Wallet as WalletType } from "@/features/personal-finance/types";
import { Wallet, X, ArrowDownRight, ArrowUpRight, AlertCircle, Loader2 } from "lucide-react";
import { MoneyInput } from "@/components/ui/money-input";

interface FundModalProps {
  isOpen: boolean;
  groupId: string;
  fund: GroupFund | null;
  canManageFund: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function FundModal({
  isOpen,
  groupId,
  fund,
  canManageFund,
  onClose,
  onSuccess,
}: FundModalProps) {
  const [activeTab, setActiveTab] = useState<"CONTRIBUTE" | "WITHDRAW">("CONTRIBUTE");
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Personal wallets
  const [userWallets, setUserWallets] = useState<WalletType[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      apiRequest<WalletType[]>("/api/v1/wallets").then((res) => {
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError("Số tiền phải lớn hơn 0 đ.");
      return;
    }

    if (activeTab === "WITHDRAW") {
      if (!fund || fund.balance < amount) {
        setError(`Số dư quỹ hiện có không đủ (${fund ? fund.balance.toLocaleString("vi-VN") : 0} đ).`);
        return;
      }
      if (!description.trim()) {
        setError("Vui lòng ghi rõ lý do rút tiền từ quỹ.");
        return;
      }
    }

    setLoading(true);
    setError(null);

    const endpoint =
      activeTab === "CONTRIBUTE"
        ? `/api/v1/groups/${groupId}/fund/contributions`
        : `/api/v1/groups/${groupId}/fund/withdrawals`;

    const payload =
      activeTab === "CONTRIBUTE"
        ? {
            amount,
            description: description.trim() || undefined,
            payer_wallet_id: selectedWalletId || undefined,
          }
        : {
            amount,
            reason: description.trim(),
            recipient_wallet_id: selectedWalletId || undefined,
          };

    const res = await apiRequest(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setAmount(0);
      setDescription("");
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-5 shadow-xl text-slate-800">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold flex items-center gap-2 text-slate-800">
            <Wallet className="h-4 w-4 text-slate-600" />
            Quản lý quỹ nhóm
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Current Balance Banner */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center mb-4">
          <span className="text-xs text-slate-500">Số dư quỹ hiện tại:</span>
          <span className="text-sm font-bold text-slate-900">
            {fund ? fund.balance.toLocaleString("vi-VN") : 0} đ
          </span>
        </div>

        {/* Tab switcher */}
        <div className="flex border border-slate-200 rounded-lg p-0.5 bg-slate-100 mb-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab("CONTRIBUTE");
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "CONTRIBUTE"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ArrowDownRight className="h-3.5 w-3.5 text-emerald-600" />
            Đóng góp quỹ
          </button>

          {canManageFund && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("WITHDRAW");
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "WITHDRAW"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />
              Rút tiền quỹ
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Nhập số tiền quỹ */}
          <MoneyInput
            id="fund-amount"
            label="Số tiền (VND)"
            required
            placeholder="0"
            value={amount}
            onChange={(val) => setAmount(val)}
          />

          {/* Ví cá nhân liên kết */}
          {userWallets.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {activeTab === "CONTRIBUTE" ? "Trừ từ ví cá nhân" : "Nhận vào ví cá nhân"}
              </label>
              <select
                value={selectedWalletId}
                onChange={(e) => setSelectedWalletId(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="">-- Không liên kết ví cá nhân --</option>
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
              {activeTab === "CONTRIBUTE" ? "Ghi chú" : "Lý do rút tiền *"}
            </label>
            <input
              type="text"
              required={activeTab === "WITHDRAW"}
              placeholder={
                activeTab === "CONTRIBUTE"
                  ? "Ví dụ: Đóng quỹ tháng 10"
                  : "Ví dụ: Trả tiền cọc phòng"
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
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
              disabled={loading}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <span>{activeTab === "CONTRIBUTE" ? "Xác nhận đóng góp" : "Xác nhận rút quỹ"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
