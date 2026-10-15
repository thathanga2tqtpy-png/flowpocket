"use client";

import React, { useState, useEffect } from "react";
import { IncomingPaymentRequest, PaymentReconciliation } from "./types";
import { qrPaymentService } from "./qr-service";
import { formatAuditDateTime } from "@/lib/date-utils";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  QrCode,
  Filter,
  Check,
  RefreshCw,
  Search,
} from "lucide-react";

interface HistoryTabProps {
  onSelectRequest: (req: IncomingPaymentRequest) => void;
  onConfirmReceipt: (req: IncomingPaymentRequest) => void;
}

export function HistoryTab({ onSelectRequest, onConfirmReceipt }: HistoryTabProps) {
  const [subTab, setSubTab] = useState<"requests" | "reconciliations">("requests");
  const [requests, setRequests] = useState<IncomingPaymentRequest[]>([]);
  const [reconciliations, setReconciliations] = useState<PaymentReconciliation[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
    setLoading(true);
    const res = await qrPaymentService.listPaymentRequests(statusFilter || undefined);
    if (res.data) {
      setRequests(res.data.items);
    }
    setLoading(false);
  };

  const loadReconciliations = async () => {
    setLoading(true);
    const res = await qrPaymentService.listReconciliations();
    if (res.data) {
      setReconciliations(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (subTab === "requests") {
      loadRequests();
    } else {
      loadReconciliations();
    }
  }, [subTab, statusFilter]);

  const handleResolveReconciliation = async (id: string) => {
    const res = await qrPaymentService.updateReconciliation(id, {
      status: "RESOLVED",
      notes: "Người dùng đã đối soát và giải quyết xong chênh lệch ngoài đời.",
    });
    if (!res.error) {
      await loadReconciliations();
    }
  };

  const formatVND = (v: number) => new Intl.NumberFormat("vi-VN").format(v) + " đ";

  return (
    <div className="space-y-4">
      {/* Sub-tab Switcher: Yêu cầu QR vs Báo cáo chênh lệch */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setSubTab("requests")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              subTab === "requests"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Yêu cầu nhận tiền ({requests.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("reconciliations")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              subTab === "reconciliations"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Ghi nhận chênh lệch ({reconciliations.length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => (subTab === "requests" ? loadRequests() : loadReconciliations())}
          title="Tải lại"
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg border border-slate-200 bg-white"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* VIEW 1: YÊU CẦU NHẬN TIỀN */}
      {subTab === "requests" && (
        <div className="space-y-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { val: "", label: "Tất cả" },
              { val: "PENDING", label: "Đang chờ" },
              { val: "USER_CONFIRMED", label: "Đã xác nhận" },
              { val: "CANCELLED", label: "Đã hủy" },
            ].map((f) => (
              <button
                key={f.val}
                type="button"
                onClick={() => setStatusFilter(f.val)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                  statusFilter === f.val
                    ? "bg-sky-600 text-white font-semibold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Đang tải lịch sử yêu cầu...</div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-xs text-slate-400">
              Không có yêu cầu nhận tiền nào phù hợp với bộ lọc.
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="p-3.5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:border-slate-300 transition space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-800">
                          {req.reference_code}
                        </span>
                        {req.status === "PENDING" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="h-3 w-3" /> Chờ nhận
                          </span>
                        )}
                        {req.status === "USER_CONFIRMED" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" /> Đã nhận
                          </span>
                        )}
                        {req.status === "CANCELLED" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                            <XCircle className="h-3 w-3" /> Đã hủy
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {req.bank_code_snapshot} • {req.masked_account_number_snapshot} •{" "}
                        {formatAuditDateTime(req.created_at)}
                      </span>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <div className="font-bold text-xs sm:text-sm text-slate-900">
                        {formatVND(req.expected_amount)}
                      </div>
                      {req.actual_amount !== null && req.actual_amount !== req.expected_amount && (
                        <div
                          className={`text-[11px] font-semibold ${
                            req.actual_amount < req.expected_amount
                              ? "text-rose-600"
                              : "text-emerald-600"
                          }`}
                        >
                          Thực nhận: {formatVND(req.actual_amount)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description / Memo */}
                  {(req.description || req.transfer_memo) && (
                    <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg flex items-center justify-between">
                      <span>{req.description || "Chuyển tiền theo mã QR"}</span>
                      <span className="font-mono text-slate-400">ND: {req.transfer_memo}</span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onSelectRequest(req)}
                      className="px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      <span>Xem lại QR</span>
                    </button>

                    {req.status === "PENDING" && (
                      <button
                        type="button"
                        onClick={() => onConfirmReceipt(req)}
                        className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Xác nhận đã nhận</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: GHI NHẬN CHÊNH LỆCH */}
      {subTab === "reconciliations" && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Danh sách các khoản thu thực nhận có chênh lệch so với số tiền tạo yêu cầu ban đầu (do
            khách gửi thiếu, trừ phí ngân hàng hoặc gửi thừa).
          </p>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Đang tải bản ghi chênh lệch...</div>
          ) : reconciliations.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-emerald-200 rounded-2xl bg-emerald-50/30 text-xs text-emerald-800 space-y-1">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
              <p className="font-semibold">Tuyệt vời! Không có chênh lệch nào.</p>
              <p className="text-[11px] text-slate-500">Mọi khoản nhận tiền đều khớp 100%.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reconciliations.map((recon) => (
                <div
                  key={recon.id}
                  className="p-3.5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        {recon.difference_type === "SHORTFALL" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="h-3 w-3" /> Nhận thiếu
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                            Nhận thừa
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            recon.status === "RESOLVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {recon.status === "RESOLVED" ? "Đã xử lý" : "Đang mở"}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        Ngày ghi nhận: {formatAuditDateTime(recon.created_at)}
                      </span>
                    </div>

                    <div className="text-right">
                      <div
                        className={`font-bold text-sm ${
                          recon.difference_amount < 0 ? "text-rose-600" : "text-sky-700"
                        }`}
                      >
                        {recon.difference_amount > 0 ? "+" : ""}
                        {formatVND(recon.difference_amount)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Yêu cầu: {formatVND(recon.expected_amount)} | Thực:{" "}
                        {formatVND(recon.actual_amount)}
                      </div>
                    </div>
                  </div>

                  {recon.notes && (
                    <div className="p-2 bg-slate-50 rounded-lg text-xs text-slate-700">
                      <strong>Ghi chú:</strong> {recon.notes}
                    </div>
                  )}

                  {recon.status !== "RESOLVED" && (
                    <div className="flex justify-end pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleResolveReconciliation(recon.id)}
                        className="px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="h-3 w-3" />
                        <span>Đánh dấu đã giải quyết</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

