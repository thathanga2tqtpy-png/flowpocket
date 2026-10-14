"use client";

import { useState } from "react";
import {
  Wallet,
  Users,
  ShieldCheck,
  CheckCircle2,
  Lock,
  User,
  UserPlus,
  ArrowRight,
  LogOut,
  Sparkles,
  Layers,
  ChevronDown,
  X
} from "lucide-react";
import { AuthProvider, useAuth } from "@/features/auth/auth-context";
import { LoginForm } from "@/features/auth/login-form";
import { RegisterForm } from "@/features/auth/register-form";
import { UserProfile } from "@/features/auth/user-profile";
import { PersonalDashboard } from "@/features/personal-finance/personal-dashboard";
import { GroupDashboard } from "@/features/groups/group-dashboard";

function AppContent() {
  const { user, loading: authLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [financeTab, setFinanceTab] = useState<"personal" | "groups">("personal");
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-sky-500/20">
              FP
            </div>
            <div>
              <span className="text-lg font-extrabold text-slate-900 tracking-tight block leading-tight">
                FlowPocket
              </span>
              <span className="text-[11px] font-medium text-slate-400 block">
                Tài chính cá nhân & Chi tiêu nhóm
              </span>
            </div>
          </div>

          {/* User Profile Bar / Auth status */}
          {user ? (
            <div className="relative flex items-center gap-2">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition shadow-xs cursor-pointer"
              >
                <div className="h-7 w-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                  {user.display_name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <span className="text-xs font-bold text-slate-800 block leading-tight">
                    {user.display_name}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {user.email}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => logout()}
                title="Đăng xuất"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Bảo mật mã hóa
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6">
        {authLoading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-400 space-y-3">
            <div className="h-8 w-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs">Đang tải dữ liệu phiên làm việc...</p>
          </div>
        ) : user ? (
          /* ========================================================================= */
          /* LOGGED IN DASHBOARD VIEW */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* User Profile Popover Modal */}
            {showProfile && (
              <div className="relative animate-in fade-in zoom-in-95 duration-150">
                <div className="absolute right-0 top-0 z-40 w-full sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl p-5">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Hồ sơ người dùng
                    </span>
                    <button
                      onClick={() => setShowProfile(false)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <UserProfile />
                </div>
              </div>
            )}

            {/* Top Navigation Switcher: Cá nhân vs Chi tiêu nhóm */}
            <div className="bg-slate-200/80 p-1.5 rounded-2xl flex max-w-md mx-auto shadow-inner">
              <button
                onClick={() => setFinanceTab("personal")}
                className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  financeTab === "personal"
                    ? "bg-white text-sky-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Wallet className="h-4 w-4 text-sky-600" />
                <span>Tài chính cá nhân</span>
              </button>

              <button
                onClick={() => setFinanceTab("groups")}
                className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  financeTab === "groups"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="h-4 w-4 text-indigo-600" />
                <span>Chi tiêu nhóm & Quỹ</span>
              </button>
            </div>

            {/* Dashboard Content */}
            <div className="animate-in fade-in duration-200">
              {financeTab === "personal" ? (
                <PersonalDashboard />
              ) : (
                <GroupDashboard currentUserId={user.id} />
              )}
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* LANDING & AUTH VIEW (CHƯA ĐĂNG NHẬP) */
          /* ========================================================================= */
          <div className="py-6 sm:py-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Hero Showcase */}
              <div className="lg:col-span-7 space-y-6 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-100 text-sky-800 text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-sky-600" />
                  <span>Nền tảng quản lý tài chính thông minh</span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  Quản lý tiền cá nhân & chia tiền nhóm <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-indigo-600">chính xác đến từng đồng.</span>
                </h1>

                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  Tạm biệt cảm giác ngại ngùng khi nhắc nợ hay chia hóa đơn du lịch, phòng trọ. FlowPocket giúp bạn theo dõi chi tiêu cá nhân độc lập và chia sẻ tài chính nhóm minh bạch, tự động và công bằng.
                </p>

                {/* Feature highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-1">
                    <div className="flex items-center gap-2 text-sky-700 font-bold text-xs">
                      <Wallet className="h-4 w-4" />
                      <span>Ví cá nhân độc lập</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Tạo nhiều ví, theo dõi thu chi, chuyển tiền nội bộ và phân loại danh mục thông minh.
                    </p>
                  </div>

                  <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-1">
                    <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
                      <Users className="h-4 w-4" />
                      <span>Chia tiền nhóm sòng phẳng</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Hỗ trợ chia đều hoặc tự chọn. Tự động bảo toàn tiền dư nguyên VND, gợi ý thanh toán tối thiểu.
                    </p>
                  </div>

                  <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-1">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                      <Layers className="h-4 w-4" />
                      <span>Quỹ chung minh bạch</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Nạp quỹ, theo dõi dòng tiền và chi trả các chi phí chung mà không tạo nợ cá nhân.
                    </p>
                  </div>

                  <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-1">
                    <div className="flex items-center gap-2 text-amber-700 font-bold text-xs">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Bảo mật cô lập 100%</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Thành viên trong nhóm hoàn toàn không thể thấy số dư hay chi tiêu cá nhân của bạn.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Clean Auth Card */}
              <div className="lg:col-span-5">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-6 sm:p-8 space-y-6">
                  {/* Segmented Auth Switcher */}
                  <div className="flex border border-slate-200 rounded-xl p-1 bg-slate-100/80">
                    <button
                      onClick={() => setActiveTab("login")}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        activeTab === "login"
                          ? "bg-white text-sky-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <User className="h-3.5 w-3.5" />
                      Đăng nhập
                    </button>

                    <button
                      onClick={() => setActiveTab("register")}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        activeTab === "register"
                          ? "bg-white text-emerald-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Đăng ký mới
                    </button>
                  </div>

                  {/* Forms */}
                  <div>
                    {activeTab === "login" ? <LoginForm /> : <RegisterForm />}
                  </div>

                  <div className="text-center pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                    Bằng cách tiếp tục, bạn đồng ý với quy chuẩn bảo mật và quản lý tài chính của FlowPocket.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 text-center">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} FlowPocket. Giải pháp tài chính cá nhân & chi tiêu nhóm.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Mã hóa Argon2id</span>
            <span>•</span>
            <span>Bảo toàn số nguyên VND</span>
            <span>•</span>
            <span>PWA Offline Shell</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
