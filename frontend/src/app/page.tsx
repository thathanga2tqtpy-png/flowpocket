"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { CheckCircle2, AlertCircle, RefreshCw, ShieldCheck, Database, Server } from "lucide-react";

interface HealthStatus {
  status: string;
  database?: string;
  service?: string;
  environment?: string;
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = async () => {
    setLoading(true);
    setError(null);
    const res = await apiRequest<HealthStatus>("/ready");
    if (res.error) {
      setError(res.error);
      setHealthData(null);
    } else {
      setHealthData(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-sky-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
            FP
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              FlowPocket
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Quản lý tài chính cá nhân & chi tiêu nhóm
            </p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Trạng thái hệ thống (Phase 1)
            </span>
            <button
              onClick={checkConnection}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 font-medium disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Kiểm tra lại
            </button>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-100">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Server className="h-4 w-4 text-sky-500" />
                <span>Backend FastAPI</span>
              </div>
              <div>
                {loading ? (
                  <span className="text-xs text-slate-400">Đang kiểm tra...</span>
                ) : healthData ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3" /> Sẵn sàng
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    <AlertCircle className="h-3 w-3" /> Mất kết nối
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-100">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Database className="h-4 w-4 text-emerald-500" />
                <span>PostgreSQL 17 (Docker)</span>
              </div>
              <div>
                {loading ? (
                  <span className="text-xs text-slate-400">Đang kiểm tra...</span>
                ) : healthData?.database === "connected" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3" /> Đã kết nối
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    <AlertCircle className="h-3 w-3" /> Chưa sẵn sàng
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-100">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <ShieldCheck className="h-4 w-4 text-indigo-500" />
                <span>BaaS Supabase</span>
              </div>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                Đã loại bỏ hoàn toàn
              </span>
            </div>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200/80 pt-4 text-center">
          <p className="text-xs text-slate-400">
            FlowPocket Monolith Modular • Next.js 14 + FastAPI + PostgreSQL 17
          </p>
        </div>
      </div>
    </main>
  );
}

