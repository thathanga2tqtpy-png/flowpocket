"use client";

import React, { useState } from "react";
import { OutgoingPaymentRequest } from "./types";
import { qrPaymentService } from "./qr-service";
import {
  Clock,
  CheckCircle2,
  X,
  Building2,
  Wallet,
  Tag,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface PendingExpensesCardProps {
  items: OutgoingPaymentRequest[];
  totalPendingAmount: number;
  onUpdated: () => void;
}

export function PendingExpensesCard({
  items,
  totalPendingAmount,
  onUpdated,
}: PendingExpensesCardProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [submittingAll, setSubmittingAll] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!items || items.length === 0) {
    return null;
  }

  const formatVND = (v: number) => new Intl.NumberFormat("vi-VN").format(v) + " đ";

  const handleConfirmSingle = async (item: OutgoingPaymentRequest) => {
    setLoadingId(item.id);
    setFeedback(null);
    try {
      const res = await qrPaymentService.confirmOutgoingPayment(item.id);
      if (res.error) {
        setFeedback({ type: "error", text: res.error });
      } else {
        setFeedback({
          type: "success",
          text: `Đã xác nhận thanh toán ${formatVND(item.amount)} vào ví ${item.wallet_name || ""}`,
        });
        onUpdated();
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Lỗi khi xác nhận giao dịch" });
    } finally {
      setLoadingId(null);
    }
  };

  const handleCancelSingle = async (item: OutgoingPaymentRequest) => {
    if (!confirm(`Bạn có chắc muốn hủy bỏ khoản chi "${item.description || 'Quét QR'}" (${formatVND(item.amount)})?`)) {
      return;
    }
    setLoadingId(item.id);
    setFeedback(null);
    try {
      const res = await qrPaymentService.cancelOutgoingPayment(item.id);
      if (res.error) {
        setFeedback({ type: "error", text: res.error });
      } else {
        setFeedback({ type: "success", text: "Đã hủy khoản chi chờ duyệt" });
        onUpdated();
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Lỗi khi hủy giao dịch" });
    } finally {
      setLoadingId(null);
    }
  };

  const handleConfirmAll = async () => {
    setSubmittingAll(true);
    setFeedback(null);
    try {
      const res = await qrPaymentService.confirmAllOutgoingPayments();
      if (res.error) {
        setFeedback({ type: "error", text: res.error });
      } else {
        setFeedback({
          type: "success",
          text: `Tuyệt vời! Đã chốt sổ thành công ${items.length} khoản chi (${formatVND(totalPendingAmount)})`,
        });
        onUpdated();
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Lỗi khi xác nhận hàng loạt" });
    } finally {
      setSubmittingAll(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-50/80 via-amber-50/40 to-orange-50/60 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-2xs shrink-0">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                Thanh toán chờ xác nhận (Pending)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-200/80 text-amber-900 rounded-full">
                {items.length} khoản
              </span>
            </div>
            <p className="text-[11px] text-amber-800/80 font-medium">
              Tổng tiền chờ chốt sổ: <strong className="text-amber-950 font-bold">{formatVND(totalPendingAmount)}</strong> • Bấm dấu tick để trừ tiền ví
            </p>
          </div>
        </div>

        {/* Quick Batch Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleConfirmAll}
            disabled={submittingAll}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            title="Chốt sổ cuối ngày: Xác nhận đã thanh toán toàn bộ"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{submittingAll ? "Đang chốt sổ..." : `Xác nhận tất cả (${items.length})`}</span>
          </button>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-100/60 rounded-lg transition cursor-pointer"
            title={expanded ? "Thu gọn danh sách" : "Mở rộng danh sách"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Feedback Message */}
      {feedback && (
        <div
          className={`mt-2.5 p-2 rounded-xl text-xs flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-100/80 text-emerald-800 border border-emerald-200"
              : "bg-rose-100/80 text-rose-800 border border-rose-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Expanded List Items */}
      {expanded && (
        <div className="mt-3 space-y-2 pt-2 border-t border-amber-200/60">
          {items.map((item) => {
            const isLoading = loadingId === item.id || submittingAll;
            return (
              <div
                key={item.id}
                className="bg-white/90 border border-amber-200/70 hover:border-amber-300 rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-2xs transition"
              >
                {/* Left: Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {item.description || "Thanh toán quét mã QR"}
                    </span>
                    {item.category_name && (
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded-md">
                        {item.category_name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                    {item.bank_name || item.bank_code ? (
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Building2 className="h-3 w-3 text-slate-400" />
                        {item.bank_name || item.bank_code} {item.account_number ? `(${item.account_number})` : ""}
                      </span>
                    ) : null}
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1">
                      <Wallet className="h-3 w-3 text-slate-400" />
                      Ví: {item.wallet_name || "Mặc định"}
                    </span>
                  </div>
                </div>

                {/* Right: Amount & Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs sm:text-sm font-extrabold text-amber-700">
                    -{formatVND(item.amount)}
                  </span>

                  {/* Tick Confirm Button */}
                  <button
                    type="button"
                    onClick={() => handleConfirmSingle(item)}
                    disabled={isLoading}
                    className="p-1.5 sm:px-2.5 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                    title="Xác nhận đã thanh toán (Trừ vào ví)"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Đã trả</span>
                  </button>

                  {/* Cancel Button */}
                  <button
                    type="button"
                    onClick={() => handleCancelSingle(item)}
                    disabled={isLoading}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50 cursor-pointer"
                    title="Hủy bỏ khoản chi này"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

