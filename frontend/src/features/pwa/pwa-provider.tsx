"use client";

import React, { useEffect, useState } from "react";
import { Download, WifiOff, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    // 1. Register Service Worker in production/supporting environments
    if ("serviceWorker" in navigator && process.env.NODE_ENV !== "development") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("PWA Service Worker registered successfully:", reg.scope);
        })
        .catch((err) => {
          console.warn("PWA Service Worker registration failed:", err);
        });
    }

    // 2. Check if already running in standalone mode (PWA installed)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // 3. Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // 4. Listen for network status changes
    const updateOnlineStatus = () => {
      setIsOffline(!navigator.onLine);
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    updateOnlineStatus();

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
    }
  };

  return (
    <>
      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 sticky top-0 z-50 shadow-sm animate-in slide-in-from-top">
          <WifiOff className="h-4 w-4" />
          <span>Bạn đang ở chế độ ngoại tuyến (Offline). Các giao dịch mới cần kết nối mạng để lưu trữ an toàn.</span>
        </div>
      )}

      {/* PWA Install Invitation Banner */}
      {installPrompt && !isInstalled && showBanner && (
        <div className="bg-sky-600 text-white px-4 py-2.5 text-xs font-medium flex items-center justify-between sticky top-0 z-40 shadow-md animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <span className="text-base">📱</span>
            <span>Cài đặt <strong>FlowPocket</strong> lên màn hình chính để quản lý chi tiêu thuận tiện hơn!</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1 bg-white text-sky-700 hover:bg-sky-50 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              Cài đặt ngay
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="text-white/80 hover:text-white p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {children}
    </>
  );
}

