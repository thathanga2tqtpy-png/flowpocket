"use client";

import React, { useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { GroupFund } from "./types";
import { Wallet, X, ArrowDownRight, ArrowUpRight, AlertCircle } from "lucide-react";

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
        ? { amount, description: description.trim() || undefined }
        : { amount, reason: description.trim() };

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
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
          <h3 className="text-lg font-bold flex items-center gap-2 text-sky-800">
            <Wallet className="h-5 w-5 text-sky-600" />
            Quản lý quỹ chung nhóm
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Balance Banner */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center mb-4">
          <span className="text-xs font-semibold text-slate-500 uppercase">Số dư quỹ hiện tại:</span>
          <span className="text-base font-bold text-sky-700">
            {fund ? fund.balance.toLocaleString("vi-VN") : 0} đ
          </span>
        </div>

        {/* Tab switcher */}
        <div className="flex border border-slate-200 rounded-xl p-1 bg-slate-100/80 mb-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab("CONTRIBUTE");
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "CONTRIBUTE"
                ? "bg-white text-emerald-700 shadow-sm"
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
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "WITHDRAW"
                  ? "bg-white text-rose-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />
              Rút tiền quỹ
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Số tiền (VND) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              required
              placeholder="0"
              value={amount || ""}
              onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              {activeTab === "CONTRIBUTE" ? "Ghi chú / Mục đích" : "Lý do rút tiền *"}
            </label>
            <input
              type="text"
              required={activeTab === "WITHDRAW"}
              placeholder={
                activeTab === "CONTRIBUTE"
                  ? "VD: Tiền quỹ sinh hoạt tháng 10..."
                  : "VD: Trả tiền cọc phòng nghỉ dưỡng..."
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2 text-white rounded-xl text-xs font-semibold transition shadow-md ${
                activeTab === "CONTRIBUTE"
                  ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20"
                  : "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20"
              }`}
            >
              {loading
                ? "Đang xử lý..."
                : activeTab === "CONTRIBUTE"
                ? "Góp tiền vào quỹ"
                : "Xác nhận rút quỹ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

