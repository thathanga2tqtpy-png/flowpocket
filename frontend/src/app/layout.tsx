import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowPocket — Quản lý tài chính cá nhân & chi tiêu nhóm",
  description: "Ứng dụng theo dõi chi tiêu cá nhân, chia tiền nhóm và đối soát công nợ thông minh",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0284c7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}

