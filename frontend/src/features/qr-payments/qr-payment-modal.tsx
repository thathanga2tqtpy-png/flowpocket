"use client";

import React, { useState } from "react";
import { IncomingPaymentRequest } from "./types";
import { Wallet, Category } from "@/features/personal-finance/types";
import { CreateRequestTab } from "./create-request-tab";
import { ActiveRequestCard } from "./active-request-card";
import { HistoryTab } from "./history-tab";
import { ConfirmReceiptModal } from "./confirm-receipt-modal";
import {
  QrCode,
  X,
  PlusCircle,
  Clock,
} from "lucide-react";

interface QRPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  categories: Category[];
  onTransactionCreated?: () => void;
  onEditWallet?: (wallet: Wallet) => void;
  onCreateWallet?: () => void;
}

export function QRPaymentModal({
  isOpen,
  onClose,
  wallets,
  categories,
  onTransactionCreated,
  onEditWallet,
  onCreateWallet,
}: QRPaymentModalProps) {
  const [activeTab, setActiveTab] = useState<"create" | "active" | "history">("create");
  const [activeRequest, setActiveRequest] = useState<IncomingPaymentRequest | null>(null);
  const [confirmingRequest, setConfirmingRequest] = useState<IncomingPaymentRequest | null>(null);

  if (!isOpen) return null;

  const handleRequestCreated = (req: IncomingPaymentRequest) => {
    setActiveRequest(req);
    setActiveTab("active");
  };

  const handleConfirmSuccess = (updated: IncomingPaymentRequest) => {
    setActiveRequest(updated);
    setConfirmingRequest(null);
    onTransactionCreated?.();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl p-4 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shadow-xs">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  Nhận tiền bằng QR (VietQR)
                </h2>
                <p className="text-[11px] text-slate-400">
                  Chuẩn VietQR Napas EMVCo • Xác nhận thủ công & Ghi nhận chênh lệch
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Sub-tabs */}
          <div className="flex items-center gap-1 overflow-x-auto py-2.5 shrink-0 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === "create"
                  ? "bg-sky-600 text-white shadow-2xs font-bold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Tạo mã QR</span>
            </button>

            {activeRequest && (
              <button
                type="button"
                onClick={() => setActiveTab("active")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === "active"
                    ? "bg-sky-600 text-white shadow-2xs font-bold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>Mã QR hiện tại</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === "history"
                  ? "bg-sky-600 text-white shadow-2xs font-bold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Lịch sử & Chênh lệch</span>
            </button>
          </div>

          {/* Tab Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto py-3 pr-1">
            {activeTab === "create" && (
              <CreateRequestTab
                wallets={wallets}
                categories={categories}
                onRequestCreated={handleRequestCreated}
                onEditWallet={onEditWallet}
                onCreateWallet={onCreateWallet}
              />
            )}

            {activeTab === "active" && activeRequest && (
              <ActiveRequestCard
                request={activeRequest}
                onOpenConfirm={(req) => setConfirmingRequest(req)}
                onRequestCancelled={(cancelled) => setActiveRequest(cancelled)}
              />
            )}

            {activeTab === "history" && (
              <HistoryTab
                onSelectRequest={(req) => {
                  setActiveRequest(req);
                  setActiveTab("active");
                }}
                onConfirmReceipt={(req) => setConfirmingRequest(req)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modal Xác nhận đã nhận tiền */}
      {confirmingRequest && (
        <ConfirmReceiptModal
          request={confirmingRequest}
          categories={categories}
          onClose={() => setConfirmingRequest(null)}
          onSuccess={handleConfirmSuccess}
        />
      )}
    </>
  );
}
