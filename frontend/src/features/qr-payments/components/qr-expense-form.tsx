"use client";

import React, { useState } from "react";
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Wallet as WalletIcon,
  Tag,
  CheckCircle2,
  ExternalLink,
  Clock,
  QrCode,
  Download,
  Info,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { ParsedVietQR } from "../vietqr-parser";
import { Wallet, Category } from "@/features/personal-finance/types";
import { MoneyInput } from "@/components/ui/money-input";
import { qrPaymentService } from "../qr-service";
import { POPULAR_BANK_APPS, openBankAppByScheme, BankAppScheme } from "../bank-deeplinks";
import { QRCanvas } from "../qr-canvas";

interface QRExpenseFormProps {
  parsedResult: ParsedVietQR;
  eligibleWallets: Wallet[];
  categories: Category[];
  selectedWalletId: string;
  onSelectWallet: (id: string) => void;
  onScanAgain: () => void;
  onSuccess: () => void;
  onClose: () => void;
  formatVND: (v: number) => string;
}

export function QRExpenseForm({
  parsedResult,
  eligibleWallets,
  categories,
  selectedWalletId,
  onSelectWallet,
  onScanAgain,
  onSuccess,
  onClose,
  formatVND,
}: QRExpenseFormProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [expenseAmount, setExpenseAmount] = useState<number>(parsedResult.amount || 0);
  const [expenseDescription, setExpenseDescription] = useState<string>(
    parsedResult.memo ? `Chi: ${parsedResult.memo}` : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [isPendingSaved, setIsPendingSaved] = useState(false);
  const [showQRPreview, setShowQRPreview] = useState(false);
  const [showAllBankApps, setShowAllBankApps] = useState(false);
  const [selectedBankApp, setSelectedBankApp] = useState<BankAppScheme | null>(null);
  const [error, setError] = useState<string | null>(null);

  const expenseCategories = categories.filter((c) => c.kind === "EXPENSE");
  const selectedWallet = eligibleWallets.find((w) => w.id === selectedWalletId);

  const walletBankCode = selectedWallet?.bank_code?.toUpperCase() || "";
  const initialBankConfig =
    POPULAR_BANK_APPS.find((b) => b.code.toUpperCase() === walletBankCode) ||
    POPULAR_BANK_APPS.find((b) => b.code.toUpperCase() === parsedResult.bankCode?.toUpperCase()) ||
    null;

  const currentBankApp = selectedBankApp || initialBankConfig;

  const copyToClipboard = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const copyAllPaymentInfo = () => {
    const lines = [
      parsedResult.bankName
        ? `Ngân hàng: ${parsedResult.bankName} (${parsedResult.bankCode || ""})`
        : null,
      parsedResult.accountNumber ? `Số tài khoản: ${parsedResult.accountNumber}` : null,
      parsedResult.accountHolderName ? `Chủ tài khoản: ${parsedResult.accountHolderName}` : null,
      expenseAmount ? `Số tiền: ${formatVND(expenseAmount)}` : null,
      expenseDescription.trim() || parsedResult.memo
        ? `Nội dung: ${expenseDescription.trim() || parsedResult.memo}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    copyToClipboard(lines, "all");
  };

  const handleSavePendingAndOpenBank = async (overrideBankApp?: BankAppScheme) => {
    setError(null);

    if (!selectedWalletId) {
      setError("Vui lòng chọn ví để chi trả");
      return;
    }
    if (!expenseAmount || expenseAmount <= 0) {
      setError("Số tiền chi phải lớn hơn 0 đ");
      return;
    }

    try {
      setSubmitting(true);
      const res = await qrPaymentService.createOutgoingPayment({
        wallet_id: selectedWalletId,
        category_id: selectedCategoryId || null,
        amount: expenseAmount,
        description:
          expenseDescription.trim() ||
          `Chi quét QR: ${parsedResult?.bankName || parsedResult?.bankCode || "VietQR"}`,
        bank_code: parsedResult?.bankCode || undefined,
        bank_name: parsedResult?.bankName || undefined,
        account_number: parsedResult?.accountNumber || undefined,
        qr_payload: parsedResult?.rawPayload || undefined,
      });

      if (res.error) {
        setError(res.error);
        setSubmitting(false);
        return;
      }

      // Tự động sao chép Số tài khoản và thông báo sao chép
      if (parsedResult.accountNumber) {
        try {
          await navigator.clipboard.writeText(parsedResult.accountNumber);
          setCopiedField("account");
        } catch {}
      }

      const targetBank = overrideBankApp || currentBankApp;
      if (targetBank) {
        setSelectedBankApp(targetBank);
        setTimeout(() => {
          openBankAppByScheme(targetBank, {
            bankCode: parsedResult.bankCode,
            bankBin: parsedResult.bankBin,
            accountNumber: parsedResult.accountNumber,
            amount: expenseAmount,
            memo: expenseDescription.trim() || parsedResult.memo,
          });
        }, 200);
      }

      // Giữ người dùng ở màn hình chuyển tiếp thanh toán để có đủ hướng sử dụng (lưu QR, copy info, mở lại bank)
      setIsPendingSaved(true);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Lỗi khi lưu khoản chi chờ xác nhận");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePendingOnly = async () => {
    setError(null);

    if (!selectedWalletId) {
      setError("Vui lòng chọn ví để chi trả");
      return;
    }
    if (!expenseAmount || expenseAmount <= 0) {
      setError("Số tiền chi phải lớn hơn 0 đ");
      return;
    }

    try {
      setSubmitting(true);
      const res = await qrPaymentService.createOutgoingPayment({
        wallet_id: selectedWalletId,
        category_id: selectedCategoryId || null,
        amount: expenseAmount,
        description:
          expenseDescription.trim() ||
          `Chi quét QR: ${parsedResult?.bankName || parsedResult?.bankCode || "VietQR"}`,
        bank_code: parsedResult?.bankCode || undefined,
        bank_name: parsedResult?.bankName || undefined,
        account_number: parsedResult?.accountNumber || undefined,
        qr_payload: parsedResult?.rawPayload || undefined,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setIsPendingSaved(true);
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || "Lỗi khi lưu khoản chi chờ xác nhận");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopenBankApp = (bank: BankAppScheme) => {
    setSelectedBankApp(bank);
    if (parsedResult.accountNumber) {
      copyToClipboard(parsedResult.accountNumber, "account");
    }
    openBankAppByScheme(bank, {
      bankCode: parsedResult.bankCode,
      bankBin: parsedResult.bankBin,
      accountNumber: parsedResult.accountNumber,
      amount: expenseAmount,
      memo: expenseDescription.trim() || parsedResult.memo,
    });
  };

  // =========================================================================
  // MÀN HÌNH CHUYỂN TIẾP THANH TOÁN (KHI ĐÃ BẤM LƯU BẢN NHÁP / CHỜ XÁC NHẬN)
  // =========================================================================
  if (isPendingSaved) {
    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        {/* Banner trạng thái */}
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Đã lưu bản nháp chờ xác nhận (Pending)!</span>
          </div>
          <p className="text-[11px] text-emerald-700 leading-relaxed">
            Khoản chi <strong className="font-bold text-slate-900">{formatVND(expenseAmount)}</strong> đã được ghi nhận an toàn vào ví FlowPocket. Số dư sẽ chỉ bị trừ khi bạn bấm xác nhận thành công.
          </p>
        </div>

        {/* Khối Mở App Ngân Hàng */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5 text-indigo-600" />
              Chuyển hướng mở App Ngân hàng
            </span>
            {currentBankApp && (
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                {currentBankApp.shortName}
              </span>
            )}
          </div>

          {currentBankApp ? (
            <button
              type="button"
              onClick={() => handleReopenBankApp(currentBankApp)}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Mở lại App {currentBankApp.name}</span>
            </button>
          ) : (
            <p className="text-xs text-slate-500">
              Chọn một ứng dụng ngân hàng bên dưới để mở và chuyển khoản:
            </p>
          )}

          {/* Chọn app ngân hàng khác */}
          <div>
            <button
              type="button"
              onClick={() => setShowAllBankApps(!showAllBankApps)}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>{showAllBankApps ? "Thu gọn danh sách app" : "Mở bằng App ngân hàng khác"}</span>
              {showAllBankApps ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {showAllBankApps && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-2 max-h-48 overflow-y-auto">
                {POPULAR_BANK_APPS.map((b) => (
                  <button
                    key={b.code}
                    type="button"
                    onClick={() => handleReopenBankApp(b)}
                    className="p-2 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-xl text-left transition flex items-center justify-between text-xs cursor-pointer bg-white"
                  >
                    <span className="font-semibold text-slate-800 truncate">{b.shortName}</span>
                    <ExternalLink className="h-3 w-3 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Khối Hỗ trợ ngân hàng không tự điền (Shinhan, VCB, Techcombank...) */}
        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
          <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
            <Info className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Dành cho App không tự điền (Shinhan SOL, VCB, Techcombank...)</span>
          </div>

          <div className="space-y-2 text-[11px] text-slate-700">
            {/* Hướng 1: Tải ảnh QR */}
            <div className="p-3 bg-white rounded-xl border border-amber-100 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <QrCode className="h-3.5 w-3.5 text-indigo-600" />
                  Cách 1: Quét từ ảnh (Tự điền 100% trên mọi App)
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                1. Bấm nút tải ảnh QR bên dưới $\rightarrow$ 2. Mở app ngân hàng chọn <strong>Quét QR từ thư viện ảnh</strong>.
              </p>
              {parsedResult.rawPayload && (
                <div className="pt-1 flex flex-col items-center">
                  <QRCanvas
                    payload={parsedResult.rawPayload}
                    referenceCode="VIETQR"
                    bankName={parsedResult.bankName || parsedResult.bankCode || "Ngân hàng"}
                    accountNumber={parsedResult.accountNumber || ""}
                    accountHolder={parsedResult.accountHolderName || ""}
                    amount={expenseAmount}
                    size={170}
                  />
                </div>
              )}
            </div>

            {/* Hướng 2: Sao chép thông tin */}
            <div className="p-3 bg-white rounded-xl border border-amber-100 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Copy className="h-3.5 w-3.5 text-indigo-600" />
                  Cách 2: Sao chép thông tin thủ công
                </span>
                <button
                  type="button"
                  onClick={copyAllPaymentInfo}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-lg border border-indigo-200 flex items-center gap-1 cursor-pointer transition"
                >
                  {copiedField === "all" ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-700">Đã sao chép tất cả</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Sao chép tất cả</span>
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-1.5 font-mono text-xs pt-1">
                {parsedResult.accountNumber && (
                  <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-500 font-sans text-[11px]">STK:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">{parsedResult.accountNumber}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(parsedResult.accountNumber!, "account")}
                        className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                        title="Sao chép STK"
                      >
                        {copiedField === "account" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 font-sans text-[11px]">Số tiền:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-rose-600">{formatVND(expenseAmount)}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(expenseAmount.toString(), "amount")}
                      className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
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

                {(expenseDescription.trim() || parsedResult.memo) && (
                  <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-500 font-sans text-[11px]">Nội dung:</span>
                    <div className="flex items-center gap-1.5 max-w-[70%]">
                      <span className="font-semibold text-slate-800 truncate">
                        {expenseDescription.trim() || parsedResult.memo}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            expenseDescription.trim() || parsedResult.memo || "",
                            "memo"
                          )
                        }
                        className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer shrink-0"
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
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Nút Hoàn tất & Đóng */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Hoàn tất & Đóng</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MÀN HÌNH NHẬP LIỆU GHI NHẬN CHI TIÊU BAN ĐẦU
  // =========================================================================
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header result */}
      <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-2xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            {parsedResult.isValidVietQR ? "Đã nhận diện mã VietQR Napas" : "Đã đọc nội dung mã QR"}
          </span>
          <div className="flex items-center gap-2">
            {parsedResult.rawPayload && (
              <button
                type="button"
                onClick={() => setShowQRPreview(!showQRPreview)}
                className="text-[11px] text-indigo-700 hover:text-indigo-900 font-semibold flex items-center gap-1 cursor-pointer bg-white/80 px-2 py-0.5 rounded-lg border border-indigo-200"
              >
                <QrCode className="h-3 w-3" />
                <span>{showQRPreview ? "Ẩn QR" : "Xem/Tải QR"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onScanAgain}
              className="text-[11px] text-indigo-700 hover:text-indigo-900 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              Quét lại
            </button>
          </div>
        </div>

        {/* QR Preview nếu người dùng bấm xem */}
        {showQRPreview && parsedResult.rawPayload && (
          <div className="p-3 bg-white rounded-xl border border-indigo-100 flex flex-col items-center animate-in fade-in">
            <QRCanvas
              payload={parsedResult.rawPayload}
              referenceCode="VIETQR"
              bankName={parsedResult.bankName || parsedResult.bankCode || "Ngân hàng"}
              accountNumber={parsedResult.accountNumber || ""}
              accountHolder={parsedResult.accountHolderName || ""}
              amount={expenseAmount || parsedResult.amount || 0}
              size={180}
            />
          </div>
        )}

        {/* Bóc tách ngân hàng & STK */}
        <div className="p-3 bg-white rounded-xl border border-indigo-100 text-xs space-y-1.5 shadow-2xs">
          {parsedResult.bankName && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Ngân hàng thụ hưởng:</span>
              <span className="font-bold text-slate-900">
                {parsedResult.bankName} ({parsedResult.bankCode})
              </span>
            </div>
          )}

          {parsedResult.accountNumber && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Số tài khoản:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-slate-900">
                  {parsedResult.accountNumber}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(parsedResult.accountNumber!, "account")}
                  className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                  title="Sao chép STK"
                >
                  {copiedField === "account" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          )}

          {parsedResult.amount && (
            <div className="flex justify-between items-center pt-1 border-t border-slate-100">
              <span className="text-slate-500">Số tiền trong QR:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-rose-600 text-sm">
                  {formatVND(parsedResult.amount)}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(parsedResult.amount!.toString(), "amount")}
                  className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
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
          )}

          {parsedResult.memo && (
            <div className="flex justify-between items-center pt-1 border-t border-slate-100">
              <span className="text-slate-500">Nội dung chuyển:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-semibold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  {parsedResult.memo}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(parsedResult.memo!, "memo")}
                  className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
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
          )}

          {/* Nút Sao chép tất cả thông tin */}
          <div className="pt-1.5 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={copyAllPaymentInfo}
              className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center gap-1.5 cursor-pointer transition"
            >
              {copiedField === "all" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Đã sao chép tất cả thông tin</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Sao chép tất cả thông tin</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Form Ghi nhận Chi Tiêu */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSavePendingAndOpenBank();
        }}
        className="space-y-3.5 pt-1"
      >
        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <WalletIcon className="h-4 w-4 text-emerald-600" />
          <span>Xác nhận thông tin chi tiêu ví FlowPocket</span>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
            {error}
          </div>
        )}

        {/* Chọn ví chi */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Chọn ví chi trả (Ngân hàng / Ví điện tử) <span className="text-rose-500">*</span>
          </label>
          {eligibleWallets.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
              Bạn chưa có ví Ngân hàng hoặc Ví điện tử nào. Vui lòng tạo mới hoặc chỉnh sửa ví hiện có sang loại Ngân hàng (BANK).
            </div>
          ) : (
            <select
              value={selectedWalletId}
              onChange={(e) => onSelectWallet(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 bg-white focus:outline-indigo-500 font-medium"
              required
            >
              {eligibleWallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.bank_code ? `[${w.bank_code}]` : `[${w.wallet_type}]`} ({formatVND(w.current_balance)})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Nhập số tiền chi */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Số tiền chi trả (VND) <span className="text-rose-500">*</span>
          </label>
          <MoneyInput
            value={expenseAmount}
            onChange={setExpenseAmount}
            placeholder="Nhập số tiền đã chuyển"
            min={1000}
            className="border-slate-200 focus-within:ring-indigo-500"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Số tiền này sẽ được lưu ở trạng thái Chờ xác nhận (Pending). Nếu bạn chuyển khoản số tiền chẵn hoặc có chênh lệch, hệ thống sẽ đối soát khi bạn xác nhận sau.
          </p>
        </div>

        {/* Chọn danh mục chi tiêu */}
        <div>
          <label className="text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-slate-500" />
            <span>Danh mục chi tiêu</span>
          </label>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 bg-white focus:outline-indigo-500"
          >
            <option value="">Chi tiêu khác / Chưa phân loại (Mặc định)</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Ghi chú chi tiêu */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Ghi chú chi tiêu
          </label>
          <input
            type="text"
            value={expenseDescription}
            onChange={(e) => setExpenseDescription(e.target.value)}
            placeholder="VD: Cà phê sáng, Mua tạp hóa..."
            maxLength={100}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-indigo-500"
          />
        </div>

        {/* Nút hành động */}
        <div className="pt-2 space-y-2">
          <button
            type="submit"
            disabled={submitting || !selectedWalletId || expenseAmount <= 0}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            <span>
              {currentBankApp
                ? `Lưu chờ xác nhận & Mở App ${currentBankApp.shortName}`
                : "Lưu chờ xác nhận & Mở App Ngân hàng"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleSavePendingOnly}
            disabled={submitting || !selectedWalletId || expenseAmount <= 0}
            className="w-full py-2 px-3 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>Chỉ lưu chờ xác nhận (không mở app bank)</span>
          </button>
        </div>
      </form>
    </div>
  );
}
