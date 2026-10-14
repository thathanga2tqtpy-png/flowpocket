import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PWAProvider } from "@/features/pwa/pwa-provider";

export const metadata: Metadata = {
  title: "FlowPocket — Quản lý tài chính cá nhân & chi tiêu nhóm",
  description: "Ứng dụng theo dõi chi tiêu cá nhân, chia tiền nhóm và đối soát công nợ thông minh",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FlowPocket",
  },
};

export const viewport: Viewport = {
  themeColor: "#0284c7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen antialiased bg-slate-50 text-slate-900 select-none sm:select-auto">
        <PWAProvider>
          {children}
        </PWAProvider>
      </body>
    </html>
  );
}
