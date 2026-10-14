"use client";

import React, { useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { GroupMemberItem, GroupFund, CreateGroupExpensePayload } from "./types";
import { Receipt, X, Users, Wallet, AlertCircle } from "lucide-react";

interface ExpenseModalProps {
  isOpen: boolean;
  groupId: string;
  members: GroupMemberItem[];
  fund: GroupFund | null;
  currentUserId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExpenseModal({
  isOpen,
  groupId,
  members,
  fund,
  currentUserId,
  onClose,
  onSuccess,
}: ExpenseModalProps) {
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [paymentSource, setPaymentSource] = useState<"MEMBER" | "FUND">("MEMBER");
  const [paidByUserId, setPaidByUserId] = useState<string>(currentUserId || (members[0]?.user_id || ""));
  const [splitMethod, setSplitMethod] = useState<"EQUAL" | "CUSTOM">("EQUAL");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    members.map((m) => m.user_id)
  );
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});
  const [expenseDate, setExpenseDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleMember = (userId: string) => {
    if (selectedMemberIds.includes(userId)) {
      if (selectedMemberIds.length === 1) {
        setError("Cần ít nhất một thành viên chịu phần chia chi phí.");
        return;
      }
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== userId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, userId]);
    }
  };

  const handleCustomAmountChange = (userId: string, val: number) => {
    setCustomSplits((prev) => ({
      ...prev,
      [userId]: val,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Vui lòng nhập tên khoản chi.");
      return;
    }
    if (totalAmount <= 0) {
      setError("Số tiền chi tiêu phải lớn hơn 0.");
      return;
    }

    if (paymentSource === "FUND") {
      if (!fund || fund.balance < totalAmount) {
        setError(
          `Số dư quỹ chung không đủ (Hiện có: ${fund ? fund.balance.toLocaleString("vi-VN") : 0} đ).`
        );
        return;
      }
    }

    setLoading(true);
    setError(null);

    let splitsPayload: { member_user_id: string; amount?: number }[] = [];

    if (splitMethod === "EQUAL") {
      splitsPayload = selectedMemberIds.map((id) => ({
        member_user_id: id,
      }));
    } else {
      let customTotal = 0;
      splitsPayload = selectedMemberIds.map((id) => {
        const amt = customSplits[id] || 0;
        customTotal += amt;
        return {
          member_user_id: id,
          amount: amt,
        };
      });

      if (customTotal !== totalAmount) {
        setError(
          `Tổng số tiền chia (${customTotal.toLocaleString("vi-VN")} đ) không khớp với tổng khoản chi (${totalAmount.toLocaleString("vi-VN")} đ).`
        );
        setLoading(false);
        return;
      }
    }

    const payload: CreateGroupExpensePayload = {
      title: title.trim(),
      total_amount: totalAmount,
      expense_date: expenseDate,
      payment_source: paymentSource,
      paid_by_user_id: paymentSource === "MEMBER" ? paidByUserId : undefined,
      split_method: splitMethod,
      splits: splitsPayload,
    };

    const res = await apiRequest(`/api/v1/groups/${groupId}/expenses`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setTitle("");
      setTotalAmount(0);
      onSuccess();
      onClose();
    }
  };

  const perPersonEstimate =
    selectedMemberIds.length > 0 && totalAmount > 0
      ? Math.round(totalAmount / selectedMemberIds.length)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
          <h3 className="text-lg font-bold flex items-center gap-2 text-sky-800">
            <Receipt className="h-5 w-5 text-sky-600" />
            Thêm khoản chi tiêu nhóm
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
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
              Tiêu đề chi tiêu <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Bữa tối lẩu gà lá é, Tiền điện tháng 10, Thuê xe..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                value={totalAmount || ""}
                onChange={(e) => setTotalAmount(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Ngày chi tiêu
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 text-sm"
              />
            </div>
          </div>

          {/* Payment Source Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Nguồn thanh toán
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentSource("MEMBER")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  paymentSource === "MEMBER"
                    ? "bg-sky-50/70 border-sky-300 shadow-sm"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Users className="h-4 w-4 text-sky-600 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Thành viên tự trả</div>
                  <div className="text-[10px] text-slate-500">Tạo công nợ phân bổ lại</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentSource("FUND")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  paymentSource === "FUND"
                    ? "bg-indigo-50/70 border-indigo-300 shadow-sm"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Wallet className="h-4 w-4 text-indigo-600 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Quỹ chung chi</div>
                  <div className="text-[10px] text-slate-500">
                    Số dư: {fund ? fund.balance.toLocaleString("vi-VN") : 0} đ
                  </div>
                </div>
              </button>
            </div>
          </div>

          {paymentSource === "MEMBER" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Ai là người đã trả tiền?
              </label>
              <select
                value={paidByUserId}
                onChange={(e) => setPaidByUserId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 text-sm"
              >
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user_full_name || m.display_name || m.user_email || m.email}
                    {m.user_id === currentUserId ? " (Bạn)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Split Method */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Phân bổ chi phí cho ai?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSplitMethod("EQUAL")}
                  className={`text-[11px] px-2.5 py-1 rounded-md font-semibold transition ${
                    splitMethod === "EQUAL"
                      ? "bg-sky-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Chia đều
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMethod("CUSTOM")}
                  className={`text-[11px] px-2.5 py-1 rounded-md font-semibold transition ${
                    splitMethod === "CUSTOM"
                      ? "bg-sky-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Tùy chọn số tiền
                </button>
              </div>
            </div>

            {splitMethod === "EQUAL" && totalAmount > 0 && (
              <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                Ước tính mỗi người chịu:{" "}
                <span className="font-bold text-sky-700">
                  {perPersonEstimate.toLocaleString("vi-VN")} đ
                </span>{" "}
                ({selectedMemberIds.length} người)
              </div>
            )}

            {/* Member list checkboxes */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
              {members.map((member) => {
                const isSelected = selectedMemberIds.includes(member.user_id);
                return (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 text-xs"
                  >
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleMember(member.user_id)}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
                      />
                      <span className="font-medium text-slate-700">
                        {member.user_full_name || member.display_name || member.user_email || member.email}
                      </span>
                    </label>

                    {splitMethod === "CUSTOM" && isSelected && (
                      <div className="flex items-center gap-1 w-32">
                        <input
                          type="number"
                          placeholder="0"
                          value={customSplits[member.user_id] || ""}
                          onChange={(e) =>
                            handleCustomAmountChange(
                              member.user_id,
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-right font-semibold"
                        />
                        <span className="text-[10px] text-slate-400">đ</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
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
              {loading ? "Đang lưu..." : "Tạo khoản chi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

