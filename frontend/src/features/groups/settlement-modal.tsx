"use client";

import React, { useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { GroupMemberItem } from "./types";
import { ArrowLeftRight, X, AlertCircle, ShieldCheck } from "lucide-react";

interface SettlementModalProps {
  isOpen: boolean;
  groupId: string;
  members: GroupMemberItem[];
  currentUserId?: string;
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toUserId) {
      setError("Vui lòng chọn người nhận tiền quyết toán.");
      return;
    }
    if (amount <= 0) {
      setError("Số tiền quyết toán phải lớn hơn 0 đ.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await apiRequest(`/api/v1/groups/${groupId}/settlements`, {
      method: "POST",
      body: JSON.stringify({
        to_user_id: toUserId,
        amount,
        note: note.trim() || undefined,
      }),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
          <h3 className="text-lg font-bold flex items-center gap-2 text-sky-800">
            <ArrowLeftRight className="h-5 w-5 text-sky-600" />
            Tạo quyết toán chuyển trả tiền
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="h-5 w-5" />
          </button>
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
              Bạn muốn trả tiền cho ai? <span className="text-rose-500">*</span>
            </label>
            <select
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 text-sm font-medium"
            >
              {otherMembers.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user_full_name || m.display_name || m.user_email || m.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Số tiền thanh toán (VND) <span className="text-rose-500">*</span>
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
              Phương thức / Ghi chú
            </label>
            <input
              type="text"
              placeholder="VD: Chuyển khoản Vietcombank, Momo, tiền mặt..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 text-sm"
            />
          </div>

          <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-start gap-2 text-xs text-sky-900">
            <ShieldCheck className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
            <span>
              Quyết toán sau khi gửi sẽ ở trạng thái <strong>Chờ xác nhận (PENDING)</strong>. Công nợ chỉ chính thức được trừ khi người nhận bấm xác nhận đã nhận tiền.
            </span>
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
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-sky-600/20"
            >
              {loading ? "Đang gửi..." : "Gửi yêu cầu quyết toán"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

