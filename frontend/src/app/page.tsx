"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("join_token");
      if (token) {
        localStorage.setItem("pending_join_token", token);
      }
    }
  }, []);

  useEffect(() => {
    if (user && typeof window !== "undefined") {
      const pending = localStorage.getItem("pending_join_token");
      if (pending) {
        setFinanceTab("groups");
      }
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-extrabold text-sm shadow-xs">
              FP
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 tracking-tight block leading-tight">
                FlowPocket
              </span>
              <span className="text-[10px] text-slate-400 block hidden sm:block">
                Tài chính cá nhân & Nhóm
              </span>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          {user && (
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setFinanceTab("personal")}
                className={`py-1 px-3 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  financeTab === "personal"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Wallet className="h-3.5 w-3.5" />
                <span>Cá nhân</span>
              </button>

              <button
                onClick={() => setFinanceTab("groups")}
                className={`py-1 px-3 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  financeTab === "groups"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Chi tiêu nhóm</span>
              </button>
            </div>
          )}

          {/* User Profile Bar / Auth status */}
          {user ? (
            <div className="relative flex items-center gap-2">
              <button
                onClick={() => setShowProfile(true)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer"
              >
                <div className="h-6 w-6 rounded bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                  {user.display_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-medium text-slate-800 hidden sm:inline">
                  {user.display_name}
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              <button
                onClick={() => logout()}
                title="Đăng xuất"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
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
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-20 sm:pb-8">
        {authLoading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-400 space-y-3">
            <div className="h-8 w-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs">Đang tải dữ liệu phiên làm việc...</p>
          </div>
        ) : user ? (
          /* ========================================================================= */
          /* LOGGED IN DASHBOARD VIEW */
          /* ========================================================================= */
          <div className="space-y-4">
            {/* User Profile Dialog Modal */}
            {showProfile && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-slate-100">
                    <span className="text-sm font-bold text-slate-800">
                      Hồ sơ người dùng
                    </span>
                    <button
                      onClick={() => setShowProfile(false)}
                      className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <UserProfile />
                </div>
              </div>
            )}

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
          <div className="py-2 sm:py-8 lg:py-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Hero Showcase - Chỉ hiển thị trên Desktop (lg) */}
              <div className="hidden lg:block lg:col-span-7 space-y-6 text-left">
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
                  <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
                    <div className="flex items-center gap-2 text-sky-700 font-bold text-xs">
                      <Wallet className="h-4 w-4" />
                      <span>Ví cá nhân độc lập</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Tạo nhiều ví, theo dõi thu chi, chuyển tiền nội bộ và phân loại danh mục thông minh.
                    </p>
                  </div>

                  <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
                    <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
                      <Users className="h-4 w-4" />
                      <span>Chia tiền nhóm sòng phẳng</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Hỗ trợ chia đều hoặc tự chọn. Tự động bảo toàn tiền dư nguyên VND, gợi ý thanh toán tối thiểu.
                    </p>
                  </div>

                  <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                      <Layers className="h-4 w-4" />
                      <span>Quỹ chung minh bạch</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Nạp quỹ, theo dõi dòng tiền và chi trả các chi phí chung mà không tạo nợ cá nhân.
                    </p>
                  </div>

                  <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
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
              <div className="w-full max-w-md mx-auto lg:max-w-none lg:col-span-5">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-5 sm:p-8 space-y-5 sm:space-y-6">
                  {/* Tiêu đề ngắn gọn trên mobile */}
                  <div className="lg:hidden text-center pb-1">
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      Chào mừng đến FlowPocket
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Quản lý tài chính cá nhân & chia tiền nhóm thông minh
                    </p>
                  </div>

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

      {/* Mobile Bottom Navigation Bar (Dành riêng cho trải nghiệm Mobile-First) */}
      {user && (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-around h-14 px-2 shadow-lg">
          <button
            onClick={() => {
              setFinanceTab("personal");
              setShowProfile(false);
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-semibold transition ${
              financeTab === "personal" && !showProfile
                ? "text-sky-600"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Wallet className="h-5 w-5 mb-0.5" />
            <span>Cá nhân</span>
          </button>
          <button
            onClick={() => {
              setFinanceTab("groups");
              setShowProfile(false);
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-semibold transition ${
              financeTab === "groups" && !showProfile
                ? "text-sky-600"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Users className="h-5 w-5 mb-0.5" />
            <span>Nhóm</span>
          </button>
          <button
            onClick={() => setShowProfile(true)}
            className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-semibold transition ${
              showProfile
                ? "text-sky-600"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <User className="h-5 w-5 mb-0.5" />
            <span>Tài khoản</span>
          </button>
        </nav>
      )}
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
