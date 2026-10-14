"use client";

import React, { useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { GroupRole, InvitationResult } from "./types";
import { Mail, Check, Copy, X, ShieldAlert } from "lucide-react";

interface InviteModalProps {
  isOpen: boolean;
  groupId: string;
  groupName: string;
  onClose: () => void;
}

export function InviteModal({ isOpen, groupId, groupName, onClose }: InviteModalProps) {
  const [role, setRole] = useState<GroupRole>("MEMBER");
  const [expiresInHours, setExpiresInHours] = useState<number>(72);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<InvitationResult | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await apiRequest<InvitationResult>(`/api/v1/groups/${groupId}/invitations`, {
      method: "POST",
      body: JSON.stringify({
        expires_in_days: Math.max(1, Math.round(expiresInHours / 24)),
      }),
    });

    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      setInviteResult(res.data);
    }
  };

  const handleCopyToken = () => {
    if (!inviteResult) return;
    const token = inviteResult.raw_token || inviteResult.invite_token || "";
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReset = () => {
    setInviteResult(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-sky-800">
            <Mail className="h-5 w-5 text-sky-600" />
            Mời thành viên vào nhóm
          </h3>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4 pb-3 border-b border-slate-100">
          Nhóm: <span className="font-bold text-slate-800">{groupName}</span>
        </p>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        {!inviteResult ? (
          <form onSubmit={handleCreateInvite} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Vai trò khi tham gia
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as GroupRole)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 text-sm"
              >
                <option value="MEMBER">Thành viên (MEMBER) — Thêm/xem chi tiêu nhóm</option>
                <option value="ADMIN">Quản trị viên (ADMIN) — Quản lý thành viên & cài đặt</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Thời hạn hiệu lực của mã
              </label>
              <select
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 text-sm"
              >
                <option value={24}>24 giờ (1 ngày)</option>
                <option value={72}>72 giờ (3 ngày - Khuyên dùng)</option>
                <option value={168}>7 ngày</option>
                <option value={720}>30 ngày</option>
              </select>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-800">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Mã lời mời chỉ dùng được đúng 1 lần. Backend chỉ lưu trữ bản băm mật mã SHA-256 để đảm bảo tính an toàn tuyệt đối.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-sky-600/20"
              >
                {loading ? "Đang tạo mã..." : "Tạo mã lời mời"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium">
              Mã lời mời đã tạo thành công! Hãy sao chép và gửi mã này cho thành viên bạn muốn mời.
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Mã bảo mật lời mời (Token)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteResult.invite_token}
                  className="w-full font-mono text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p>• Hết hạn vào: <span className="font-semibold text-slate-700">{new Date(inviteResult.expires_at).toLocaleString("vi-VN")}</span></p>
              <p>• Thành viên có thể dán mã này vào mục &quot;Tham gia bằng mã&quot; trên ứng dụng.</p>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-sky-600 hover:underline font-medium"
              >
                Tạo mã mới khác
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

