"use client";

import React, { useState } from "react";
import { IncomingPaymentRequest } from "./types";
import { qrPaymentService } from "./qr-service";
import { MoneyInput } from "@/components/ui/money-input";
import { Category } from "@/features/personal-finance/types";
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  ShieldCheck,
  Tag,
} from "lucide-react";

interface ConfirmReceiptModalProps {
  request: IncomingPaymentRequest;
  categories?: Category[];
  onClose: () => void;
  onSuccess: (updated: IncomingPaymentRequest) => void;
}

export function ConfirmReceiptModal({
  request,
  categories = [],
  onClose,
  onSuccess,
}: ConfirmReceiptModalProps) {
  const incomeCategories = categories.filter((c) => c.kind === "INCOME" && !c.is_archived);
  const defaultCategory =
    request.category_id ||
    incomeCategories.find((c) => c.name.includes("khác") || c.name.includes("Khác"))?.id ||
    (incomeCategories.length > 0 ? incomeCategories[0].id : "");

  const [actualAmount, setActualAmount] = useState<number>(request.expected_amount);
  const [categoryId, setCategoryId] = useState<string>(defaultCategory);
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatVND = (v: number) => new Intl.NumberFormat("vi-VN").format(v) + " đ";

  const diff = actualAmount - request.expected_amount;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (actualAmount < 0) {
      setError("Số tiền thực nhận không được âm");
      return;
    }

    try {
      setSubmitting(true);
      const res = await qrPaymentService.confirmPaymentReceived(request.id, {
        actual_amount: actualAmount,
        category_id: categoryId || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        onSuccess(res.data);
      }
    } catch (err: any) {
      setError(err.message || "Lỗi khi xác nhận giao dịch");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Xác nhận đã nhận tiền</h3>
              <p className="text-[11px] text-slate-400">Yêu cầu: {request.reference_code}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirm} className="space-y-4 pt-3">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {error}
            </div>
          )}

          {/* Thông tin số tiền yêu cầu */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-500">Số tiền yêu cầu ban đầu:</span>
            <span className="font-bold text-slate-800 text-sm">
              {formatVND(request.expected_amount)}
            </span>
          </div>

          {/* Nhập số tiền thực nhận */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Số tiền thực tế nhận được (VND) <span className="text-rose-500">*</span>
            </label>
            <MoneyInput
              value={actualAmount}
              onChange={setActualAmount}
              placeholder="Nhập số tiền thực nhận"
              min={0}
              className="border-slate-200 focus-within:ring-emerald-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Mặc định điền bằng số tiền yêu cầu. Hãy sửa nếu người chuyển gửi thiếu hoặc thừa.
            </p>
          </div>

          {/* Phân tích chênh lệch */}
          {diff === 0 ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Số tiền thực nhận khớp 100% với yêu cầu ({formatVND(actualAmount)}).</span>
            </div>
          ) : diff < 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Nhận thiếu {formatVND(Math.abs(diff))}</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Hệ thống sẽ ghi nhận thu nhập <strong>{formatVND(actualAmount)}</strong> vào ví và
                tự động tạo bản ghi chênh lệch (Shortfall) để bạn theo dõi thu hồi khoản thiếu sau.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-sky-800">
                <Info className="h-4 w-4 text-sky-600 shrink-0" />
                <span>Nhận thừa +{formatVND(diff)}</span>
              </div>
              <p className="text-[11px] text-sky-700 leading-relaxed">
                Hệ thống sẽ ghi nhận toàn bộ <strong>{formatVND(actualAmount)}</strong> vào ví và tạo
                bản ghi chênh lệch (Overpayment) để theo dõi.
              </p>
            </div>
          )}

          {/* Phân loại danh mục thu nhập */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-slate-500" />
              <span>Danh mục thu nhập</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-emerald-500 font-medium"
            >
              <option value="">-- Mặc định (Thu nhập khác) --</option>
              {incomeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Khoản thu sẽ được phân loại vào danh mục này để tổng hợp báo cáo dòng tiền.
            </p>
          </div>

          {/* Ghi chú / Lý do lệch */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Ghi chú xác nhận / Giải trình lệch (Tùy chọn)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ví dụ: Bạn ấy trừ phí chuyển tiền 5.500đ, hoặc Típ thêm 20k..."
              rows={2}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 bg-white focus:outline-emerald-500"
            />
          </div>

          {/* Thông báo trách nhiệm & bảo mật */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              Khoản thu sẽ được ghi nhận vào ví cá nhân theo xác nhận thủ công của bạn, chưa qua đối
              soát ngân hàng tự động.
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{submitting ? "Đang ghi nhận..." : "Xác nhận & Cập nhật ví"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

