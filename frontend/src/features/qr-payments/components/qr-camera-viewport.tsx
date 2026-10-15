"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import jsQR from "jsqr";
import { Camera, UploadCloud, AlertCircle } from "lucide-react";
import { parseVietQRPayload, ParsedVietQR } from "../vietqr-parser";

interface QRCameraViewportProps {
  scanMode: "camera" | "upload";
  onSetScanMode: (mode: "camera" | "upload") => void;
  onScanSuccess: (result: ParsedVietQR) => void;
  isOpen: boolean;
}

export function QRCameraViewport({
  scanMode,
  onSetScanMode,
  onScanSuccess,
  isOpen,
}: QRCameraViewportProps) {
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const scanQRCodeFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data) {
        try {
          const parsed = parseVietQRPayload(code.data);
          stopCamera();
          onScanSuccess(parsed);
          return;
        } catch {
          // Continue scanning if parse fails
        }
      }
    }

    animationFrameId.current = requestAnimationFrame(scanQRCodeFrame);
  }, [onScanSuccess, stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    stopCamera();

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        animationFrameId.current = requestAnimationFrame(scanQRCodeFrame);
      }
    } catch (err: any) {
      console.warn("Camera start failed, falling back to simple video:", err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.setAttribute("playsinline", "true");
          await videoRef.current.play();
          animationFrameId.current = requestAnimationFrame(scanQRCodeFrame);
        }
      } catch (fallbackErr: any) {
        setCameraError(
          "Không thể truy cập máy ảnh. Vui lòng cấp quyền truy cập Camera hoặc sử dụng tính năng tải ảnh QR."
        );
      }
    }
  }, [scanQRCodeFrame, stopCamera]);

  useEffect(() => {
    if (isOpen && scanMode === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, scanMode, startCamera, stopCamera]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          try {
            const parsed = parseVietQRPayload(code.data);
            onScanSuccess(parsed);
          } catch (err: any) {
            setCameraError("Mã QR không đúng định dạng Napas VietQR hợp lệ");
          }
        } else {
          setCameraError("Không nhận diện được mã QR trong bức ảnh đã tải lên. Hãy thử ảnh rõ nét hơn.");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      {/* Mode switch */}
      <div className="flex items-center justify-center gap-1 bg-slate-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => onSetScanMode("camera")}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
            scanMode === "camera"
              ? "bg-white text-slate-900 shadow-2xs font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Camera className="h-3.5 w-3.5" />
          <span>Quét bằng Camera</span>
        </button>
        <button
          type="button"
          onClick={() => onSetScanMode("upload")}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
            scanMode === "upload"
              ? "bg-white text-slate-900 shadow-2xs font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <UploadCloud className="h-3.5 w-3.5" />
          <span>Tải ảnh QR từ máy</span>
        </button>
      </div>

      {cameraError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Camera Scanner View */}
      {scanMode === "camera" && (
        <div className="relative w-full aspect-square max-w-[320px] mx-auto rounded-3xl overflow-hidden bg-slate-950 flex items-center justify-center shadow-inner border-2 border-slate-800">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Viewfinder UI Overlay */}
          <div className="absolute inset-0 border-[36px] border-black/50 pointer-events-none flex items-center justify-center">
            <div className="relative w-full h-full border-2 border-indigo-500 rounded-2xl">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-indigo-400 -mt-1 -ml-1 rounded-tl" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-indigo-400 -mt-1 -mr-1 rounded-tr" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-indigo-400 -mb-1 -ml-1 rounded-bl" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-indigo-400 -mb-1 -mr-1 rounded-br" />
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse" />
            </div>
          </div>

          <div className="absolute bottom-2 inset-x-0 text-center text-[11px] text-white/80 font-medium px-4">
            Hướng camera về phía mã VietQR để quét
          </div>
        </div>
      )}

      {/* Upload Image View */}
      {scanMode === "upload" && (
        <div className="p-8 border-2 border-dashed border-slate-300 rounded-3xl bg-slate-50/50 hover:bg-slate-50 transition text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">
              Chọn ảnh mã QR chuyển khoản hoặc hóa đơn
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Hỗ trợ ảnh chụp màn hình bill, ảnh Zalo, Messenger (PNG, JPG)
            </p>
          </div>

          <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer">
            <span>Chọn ảnh từ thiết bị</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      )}
    </div>
  );
}

