"use client";

import React, { useState } from "react";
import { IncomingPaymentRequest } from "./types";
import { QRCanvas } from "./qr-canvas";
import { qrPaymentService } from "./qr-service";
import {
  Copy,
  Check,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

interface ActiveRequestCardProps {
  request: IncomingPaymentRequest;
  onOpenConfirm: (req: IncomingPaymentRequest) => void;
  onRequestCancelled: (req: IncomingPaymentRequest) => void;
}

export function ActiveRequestCard({
  request,
  onOpenConfirm,
  onRequestCancelled,
}: ActiveRequestCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCancel = async () => {
    if (!confirm("Bạn có chắc chắn muốn hủy yêu cầu nhận tiền này?")) return;
    try {
      setCancelling(true);
      const res = await qrPaymentService.cancelPaymentRequest(request.id);
      if (res.data) {
        onRequestCancelled(res.data);
      } else if (res.error) {
        alert(res.error);
      }
    } finally {
      setCancelling(false);
    }
  };

  const formatVND = (val: number) => new Intl.NumberFormat("vi-VN").format(val) + " đ";

  return (
    <div className="p-4 sm:p-5 bg-white border border-slate-200/90 rounded-2xl shadow-sm space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          {request.status === "PENDING" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
              Đang chờ nhận tiền
            </span>
          )}
          {request.status === "USER_CONFIRMED" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Đã xác nhận thực nhận
            </span>
          )}
          {request.status === "CANCELLED" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
              <XCircle className="h-3.5 w-3.5" />
              Đã hủy
            </span>
          )}
        </div>

        <span className="text-[11px] font-mono text-slate-400">
          Mã: <strong className="text-slate-700">{request.reference_code}</strong>
        </span>
      </div>

      {/* Main Grid: QR Left & Info Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* QR Section */}
        <div className="md:col-span-5 flex flex-col items-center">
          <QRCanvas
            payload={request.qr_payload}
            referenceCode={request.reference_code}
            bankName={request.bank_name_snapshot}
            accountNumber={request.account_number_snapshot}
            accountHolder={request.account_holder_snapshot}
            amount={request.expected_amount}
            size={220}
          />
        </div>

        {/* Transfer Details Section */}
        <div className="md:col-span-7 space-y-2.5">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs">
            {/* Ngân hàng */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Ngân hàng:</span>
              <span className="font-bold text-slate-800">
                {request.bank_code_snapshot} ({request.bank_name_snapshot})
              </span>
            </div>

            {/* Số tài khoản */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Số tài khoản:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {request.account_number_snapshot}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(request.account_number_snapshot, "account")}
                  className="p-1 text-slate-400 hover:text-sky-600 transition"
                  title="Sao chép số tài khoản"
                >
                  {copiedField === "account" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Tên chủ tài khoản */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Chủ tài khoản:</span>
              <span className="font-semibold text-slate-800 uppercase">
                {request.account_holder_snapshot}
              </span>
            </div>

            {/* Số tiền yêu cầu */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
              <span className="text-slate-500">Số tiền cần nhận:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sky-700 text-sm sm:text-base">
                  {formatVND(request.expected_amount)}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(String(request.expected_amount), "amount")}
                  className="p-1 text-slate-400 hover:text-sky-600 transition"
                  title="Sao chép số tiền"
                >
                  {copiedField === "amount" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Nội dung chuyển khoản */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
              <span className="text-slate-500">Nội dung CK:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {request.transfer_memo}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(request.transfer_memo, "memo")}
                  className="p-1 text-slate-400 hover:text-sky-600 transition"
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
          </div>

          {/* Ghi chú bảo mật & nghiệp vụ */}
          <div className="p-2.5 bg-sky-50/70 border border-sky-100 rounded-xl text-[11px] text-sky-800 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <strong>Lưu ý:</strong> Khoản này đang ở trạng thái chờ và <em>chưa được cộng vào ví</em>.
              Sau khi bạn kiểm tra tài khoản ngân hàng và thấy tiền đã về thực tế, hãy bấm{" "}
              <strong>"Đã nhận tiền"</strong>.
            </div>
          </div>

          {/* Fast Actions: Confirm receipt or Cancel */}
          {request.status === "PENDING" && (
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => onOpenConfirm(request)}
                className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Đã nhận tiền</span>
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="py-2.5 px-3 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                {cancelling ? "Đang hủy..." : "Hủy yêu cầu"}
              </button>
            </div>
          )}

          {/* Nếu đã xác nhận, hiển thị kết quả */}
          {request.status === "USER_CONFIRMED" && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
              <div className="flex justify-between font-semibold text-emerald-900">
                <span>Số tiền thực nhận:</span>
                <span>{formatVND(request.actual_amount || 0)}</span>
              </div>
              {request.reconciliation && (
                <div className="text-[11px] pt-1 text-amber-700">
                  Lệch so với yêu cầu:{" "}
                  <strong>
                    {request.reconciliation.difference_amount > 0 ? "+" : ""}
                    {formatVND(request.reconciliation.difference_amount)}
                  </strong>{" "}
                  ({request.reconciliation.difference_type})
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

