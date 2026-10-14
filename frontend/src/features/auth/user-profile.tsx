"use client";

import React, { useState } from "react";
import { useAuth } from "./auth-context";
import { UserCheck, LogOut, ShieldAlert, CheckCircle2, Clock } from "lucide-react";

export function UserProfile() {
  const { user, logout, revokeAllSessions } = useAuth();
  const [loadingAction, setLoadingAction] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!user) return null;

  const handleRevokeAll = async () => {
    if (!confirm("Bạn có chắc chắn muốn thu hồi toàn bộ phiên đăng nhập trên mọi thiết bị?")) return;
    setLoadingAction(true);
    const res = await revokeAllSessions();
    if (res.message) setMsg(res.message);
    setLoadingAction(false);
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg border border-emerald-200">
            {user.display_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              {user.display_name}
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="h-3 w-3" /> Đã xác thực
              </span>
            </h3>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 border-t border-slate-200 pt-3">
        <div>
          <span className="text-slate-400 block text-[11px]">Trạng thái:</span>
          <span className="font-semibold text-emerald-700">{user.status}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Ngày tham gia:</span>
          <span className="font-medium text-slate-700">
            {new Date(user.created_at).toLocaleDateString("vi-VN")}
          </span>
        </div>
      </div>

      {msg && (
        <div className="p-2.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
          {msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
        <button
          onClick={logout}
          disabled={loadingAction}
          className="w-full sm:w-1/2 flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5 text-slate-500" />
          <span>Đăng xuất</span>
        </button>

        <button
          onClick={handleRevokeAll}
          disabled={loadingAction}
          className="w-full sm:w-1/2 flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 transition-colors"
        >
          <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
          <span>Thu hồi mọi phiên</span>
        </button>
      </div>
    </div>
  );
}

