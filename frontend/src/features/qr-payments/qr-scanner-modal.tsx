"use client";

import React, { useState, useEffect } from "react";
import { ParsedVietQR } from "./vietqr-parser";
import { Wallet, Category } from "@/features/personal-finance/types";
import { Scan, X } from "lucide-react";
import { QRCameraViewport } from "./components/qr-camera-viewport";
import { QRExpenseForm } from "./components/qr-expense-form";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  categories: Category[];
  onExpenseRecorded?: () => void;
}

export function QRScannerModal({
  isOpen,
  onClose,
  wallets,
  categories,
  onExpenseRecorded,
}: QRScannerModalProps) {
  const [scanMode, setScanMode] = useState<"camera" | "upload">("camera");
  const [parsedResult, setParsedResult] = useState<ParsedVietQR | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");

  // Only allow BANK and E_WALLET for QR payments (CASH cannot scan QR to transfer)
  const eligibleWallets = wallets.filter(
    (w) => w.wallet_type === "BANK" || w.wallet_type === "E_WALLET"
  );

  // Initialize wallet selection from eligible wallets
  useEffect(() => {
    if (eligibleWallets.length > 0 && (!selectedWalletId || !eligibleWallets.some((w) => w.id === selectedWalletId))) {
      if (parsedResult?.bankCode) {
        const matchingWallet = eligibleWallets.find(
          (w) => w.bank_code?.toUpperCase() === parsedResult.bankCode?.toUpperCase()
        );
        if (matchingWallet) {
          setSelectedWalletId(matchingWallet.id);
          return;
        }
      }
      setSelectedWalletId(eligibleWallets[0].id);
    }
  }, [eligibleWallets, selectedWalletId, parsedResult]);

  // Reset when closing modal
  useEffect(() => {
    if (!isOpen) {
      setParsedResult(null);
      setScanMode("camera");
    }
  }, [isOpen]);

  const handleScanSuccess = (result: ParsedVietQR) => {
    setParsedResult(result);
  };

  const handleScanAgain = () => {
    setParsedResult(null);
    setScanMode("camera");
  };

  const formatVND = (v: number) => new Intl.NumberFormat("vi-VN").format(v) + " đ";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-4 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Scan className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Quét mã QR chuyển tiền & Chi tiêu
              </h2>
              <p className="text-[11px] text-slate-400">
                Tự động nhận diện Napas VietQR • Ghi nhận chi tiêu vào ví
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {!parsedResult ? (
            <QRCameraViewport
              scanMode={scanMode}
              onSetScanMode={setScanMode}
              onScanSuccess={handleScanSuccess}
              isOpen={isOpen}
            />
          ) : (
            <QRExpenseForm
              parsedResult={parsedResult}
              eligibleWallets={eligibleWallets}
              categories={categories}
              selectedWalletId={selectedWalletId}
              onSelectWallet={setSelectedWalletId}
              onScanAgain={handleScanAgain}
              onSuccess={() => onExpenseRecorded?.()}
              onClose={onClose}
              formatVND={formatVND}
            />
          )}
        </div>
      </div>
    </div>
  );
}
