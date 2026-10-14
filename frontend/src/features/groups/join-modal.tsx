"use client";

import React, { useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { GroupMemberItem } from "./types";
import { Link2, X, ShieldCheck } from "lucide-react";

interface JoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function JoinModal({ isOpen, onClose, onSuccess }: JoinModalProps) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError("Vui lòng nhập hoặc dán mã lời mời");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await apiRequest<GroupMemberItem>("/api/v1/groups/join", {
      method: "POST",
      body: JSON.stringify({ token: token.trim() }),
    });

    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setToken("");
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold flex items-center gap-2 text-sky-800">
            <Link2 className="h-5 w-5 text-sky-600" />
            Tham gia nhóm bằng mã lời mời
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Mã bảo mật lời mời (Token)
            </label>
            <input
              type="text"
              required
              placeholder="Dán mã mời (dài 43 ký tự) vào đây..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 placeholder-slate-400 text-sm font-mono"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2 text-xs text-slate-600">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Tài chính cá nhân, số dư ví và các chi tiêu riêng của bạn hoàn toàn bảo mật và không bao giờ chia sẻ cho các thành viên trong nhóm.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-sky-600/20"
            >
              {loading ? "Đang xử lý..." : "Tham gia nhóm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

