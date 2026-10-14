"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { CheckCircle2, AlertCircle, RefreshCw, ShieldCheck, Database, Server, User, UserPlus, Lock } from "lucide-react";
import { AuthProvider, useAuth } from "@/features/auth/auth-context";
import { LoginForm } from "@/features/auth/login-form";
import { RegisterForm } from "@/features/auth/register-form";
import { UserProfile } from "@/features/auth/user-profile";

interface HealthStatus {
  status: string;
  database?: string;
  service?: string;
  environment?: string;
}

function MainDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  const [healthLoading, setHealthLoading] = useState(true);
  const [healthData, setHealthData] = useState<HealthStatus | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const checkConnection = async () => {
    setHealthLoading(true);
    setHealthError(null);
    const res = await apiRequest<HealthStatus>("/ready");
    if (res.error) {
      setHealthError(res.error);
      setHealthData(null);
    } else {
      setHealthData(res.data);
    }
    setHealthLoading(false);
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 sm:p-8 space-y-6">
        {/* App Header */}
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-sky-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
            FP
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              FlowPocket
            </h1>
            <p className="text-xs text-slate-500">
              Quản lý tài chính cá nhân & chi tiêu nhóm
            </p>
          </div>
        </div>

        {/* Phase 2 Authentication Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-sky-600" />
              Xác thực người dùng (Phase 2)
            </span>
          </div>

          {authLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Đang tải thông tin tài khoản...
            </div>
          ) : user ? (
            <UserProfile />
          ) : (
            <div className="space-y-4">
              <div className="flex border border-slate-200 rounded-lg p-1 bg-slate-50">
                <button
                  onClick={() => setActiveTab("login")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
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
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "register"
                      ? "bg-white text-emerald-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Đăng ký
                </button>
              </div>

              {activeTab === "login" ? <LoginForm /> : <RegisterForm />}
            </div>
          )}
        </div>

        {/* System Health Check Section */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Nền tảng hệ thống
            </span>
            <button
              onClick={checkConnection}
              disabled={healthLoading}
              className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:text-sky-700 font-medium disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${healthLoading ? "animate-spin" : ""}`} />
              Kiểm tra
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Server className="h-3.5 w-3.5 text-sky-500" />
                <span>FastAPI Backend</span>
              </div>
              <div>
                {healthLoading ? (
                  <span className="text-[11px] text-slate-400">Kiểm tra...</span>
                ) : healthData ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Sẵn sàng
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    <AlertCircle className="h-2.5 w-2.5" /> Mất kết nối
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Database className="h-3.5 w-3.5 text-emerald-500" />
                <span>PostgreSQL 17</span>
              </div>
              <div>
                {healthLoading ? (
                  <span className="text-[11px] text-slate-400">Kiểm tra...</span>
                ) : healthData?.database === "connected" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Đã kết nối
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    <AlertCircle className="h-2.5 w-2.5" /> Chưa sẵn sàng
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                <span>Bảo mật Session</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                Argon2id + HttpOnly
              </span>
            </div>
          </div>

          {healthError && (
            <div className="mt-2.5 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {healthError}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200/80 pt-3 text-center">
          <p className="text-[11px] text-slate-400">
            FlowPocket Monolith Modular • Next.js 14 + FastAPI + PostgreSQL 17
          </p>
        </div>
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <AuthProvider>
      <MainDashboard />
    </AuthProvider>
  );
}
