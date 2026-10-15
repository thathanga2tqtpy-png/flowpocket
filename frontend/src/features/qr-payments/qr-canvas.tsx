"use client";

import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, AlertCircle, Check, Copy } from "lucide-react";

interface QRCanvasProps {
  payload: string;
  referenceCode: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  amount: number;
  size?: number;
}

export function QRCanvas({
  payload,
  referenceCode,
  bankName,
  accountNumber,
  accountHolder,
  amount,
  size = 230,
}: QRCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !payload) return;

    QRCode.toCanvas(
      canvasRef.current,
      payload,
      {
        width: size,
        margin: 2,
        color: {
          dark: "#0f172a", // slate-900
          light: "#ffffff",
        },
        errorCorrectionLevel: "M",
      },
      (err) => {
        if (err) {
          console.error("Lỗi vẽ mã QR:", err);
          setError("Không thể hiển thị mã QR: Payload không đúng định dạng");
        } else {
          setError(null);
        }
      }
    );
  }, [payload, size]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    try {
      setDownloading(true);

      // Tạo canvas có tiêu đề và thông tin để người nhận dễ đối chiếu
      const exportCanvas = document.createElement("canvas");
      const ctx = exportCanvas.getContext("2d");
      if (!ctx) return;

      const cardWidth = 360;
      const cardHeight = 480;
      exportCanvas.width = cardWidth;
      exportCanvas.height = cardHeight;

      // Background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, cardWidth, cardHeight);

      // Header Banner
      ctx.fillStyle = "#0284c7"; // sky-600
      ctx.fillRect(0, 0, cardWidth, 60);

      // Header text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("VIETQR THANH TOÁN", cardWidth / 2, 36);

      // Draw QR Canvas in center
      const qrSize = 240;
      const qrX = (cardWidth - qrSize) / 2;
      const qrY = 75;
      ctx.drawImage(canvasRef.current, qrX, qrY, qrSize, qrSize);

      // Bank info below QR
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${bankName.toUpperCase()}`, cardWidth / 2, 335);

      ctx.fillStyle = "#475569";
      ctx.font = "14px monospace";
      ctx.fillText(`STK: ${accountNumber}`, cardWidth / 2, 360);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText(`CHỦ TK: ${accountHolder.toUpperCase()}`, cardWidth / 2, 385);

      // Amount
      ctx.fillStyle = "#0284c7";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText(`${new Intl.NumberFormat("vi-VN").format(amount)} đ`, cardWidth / 2, 420);

      // Memo / Reference
      ctx.fillStyle = "#64748b";
      ctx.font = "11px sans-serif";
      ctx.fillText(`Mã ND: ${referenceCode}`, cardWidth / 2, 445);

      // Watermark FlowPocket
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px sans-serif";
      ctx.fillText("Được tạo bởi FlowPocket", cardWidth / 2, 465);

      const url = exportCanvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `VietQR-${referenceCode}.png`;
      a.click();

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error("Lỗi tải ảnh QR:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="relative p-3 bg-white rounded-2xl border-2 border-slate-200/90 shadow-sm flex flex-col items-center">
          <canvas ref={canvasRef} className="rounded-lg" />
          <div className="text-[10px] text-slate-400 font-mono mt-1 text-center">
            Chuẩn Napas VietQR EMVCo
          </div>
        </div>
      )}

      {/* Nút tải ảnh */}
      {!error && (
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
        >
          {downloadSuccess ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-emerald-700">Đã lưu ảnh QR</span>
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5" />
              <span>Tải ảnh QR về máy</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

