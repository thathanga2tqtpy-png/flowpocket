"use client";

import React, { useState } from "react";
import { groupService } from "./group-service";
import { GroupRole, InvitationResult, GroupMemberItem } from "./types";
import {
  UserPlus,
  Link2,
  Mail,
  Check,
  Copy,
  X,
  Users,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface InviteModalProps {
  isOpen: boolean;
  groupId: string;
  groupName: string;
  onClose: () => void;
  onMemberAdded?: () => void;
}

export function InviteModal({
  isOpen,
  groupId,
  groupName,
  onClose,
  onMemberAdded,
}: InviteModalProps) {
  const [activeTab, setActiveTab] = useState<"email" | "link">("email");

  // Tab 1: Direct add by email
  const [email, setEmail] = useState("");
  const [memberRole, setMemberRole] = useState<GroupRole>("MEMBER");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  // Tab 2: Multi-use invite link
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<InvitationResult | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const handleAddByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setEmailLoading(true);
    setEmailError(null);
    setEmailSuccess(null);

    const res = await groupService.addMemberByEmail(
      groupId,
      email.trim().toLowerCase(),
      memberRole,
    );

    setEmailLoading(false);
    if (res.error) {
      setEmailError(res.error);
    } else if (res.data) {
      const addedName =
        res.data.display_name ||
        res.data.user_full_name ||
        res.data.email ||
        email;
      setEmailSuccess(
        `Đã thêm thành viên "${addedName}" vào nhóm thành công!`
      );
      setEmail("");
      onMemberAdded?.();
    }
  };

  const handleCreateInviteLink = async () => {
    setLinkLoading(true);
    setLinkError(null);

    const res = await groupService.createInvitation(groupId, {
      expires_in_days: expiresInDays,
      reusable: true,
    });

    setLinkLoading(false);
    if (res.error) {
      setLinkError(res.error);
    } else if (res.data) {
      setInviteResult(res.data);
    }
  };

  const getFullInviteUrl = (token: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/?join_token=${encodeURIComponent(token)}`;
    }
    return `/?join_token=${token}`;
  };

  const handleCopyLink = () => {
    if (!inviteResult) return;
    const token = inviteResult.raw_token || inviteResult.invite_token || "";
    const url = getFullInviteUrl(token);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCode = () => {
    if (!inviteResult) return;
    const token = inviteResult.raw_token || inviteResult.invite_token || "";
    navigator.clipboard.writeText(token);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleClose = () => {
    setEmail("");
    setEmailError(null);
    setEmailSuccess(null);
    setInviteResult(null);
    setLinkError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900">
            <Users className="h-5 w-5 text-sky-600" />
            Mời & Thêm thành viên
          </h3>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4 pb-3 border-b border-slate-100">
          Nhóm: <span className="font-semibold text-slate-800">{groupName}</span>
        </p>

        {/* Tab selection */}
        <div className="flex p-1 bg-slate-100 rounded-xl mb-4 border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab("email")}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === "email"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Mail className="h-4 w-4 text-sky-600" />
            <span>Thêm bằng Gmail</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("link")}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === "link"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Link2 className="h-4 w-4 text-indigo-600" />
            <span>Link mời nhiều người</span>
          </button>
        </div>

        {/* TAB 1: ADD BY EMAIL */}
        {activeTab === "email" && (
          <div className="space-y-4">
            {emailError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{emailError}</span>
                </div>
                {emailError.includes("chưa") && (
                  <button
                    type="button"
                    onClick={() => {
                      setEmailError(null);
                      setActiveTab("link");
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:underline pl-6"
                  >
                    <span>Lấy link mời gửi bạn bè</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            {emailSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{emailSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddByEmail} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email tài khoản thành viên <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="ví dụ: banbe@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 text-sm placeholder-slate-400"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Thành viên sẽ được thêm ngay vào nhóm mà không cần thao tác chấp nhận lời mời.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vai trò trong nhóm
                </label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as GroupRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 text-xs"
                >
                  <option value="MEMBER">
                    Thành viên (MEMBER) — Thêm & xem chi tiêu nhóm
                  </option>
                  <option value="ADMIN">
                    Quản trị viên (ADMIN) — Quản lý thành viên & cài đặt
                  </option>
                </select>
              </div>

              <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-xl flex items-start gap-2 text-xs text-sky-800">
                <ShieldCheck className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                <span>
                  Thành viên cần có tài khoản FlowPocket trước đó. Nếu chưa có, bạn có thể chuyển sang tab &quot;Link mời&quot; để gửi đường dẫn cho bạn bè đăng ký.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={emailLoading || !email.trim()}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-sky-600/20 flex items-center gap-1.5"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>{emailLoading ? "Đang thêm..." : "Thêm vào nhóm"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: MULTI-USE INVITE LINK */}
        {activeTab === "link" && (
          <div className="space-y-4">
            {linkError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
                {linkError}
              </div>
            )}

            {!inviteResult ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">
                    🔗 Link mời dùng chung cho nhiều thành viên
                  </p>
                  <p>
                    Bạn chỉ cần tạo link một lần và chia sẻ vào nhóm Zalo, Messenger hoặc Telegram. Tất cả mọi người đều có thể bấm vào link để tự động tham gia nhóm.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thời hạn hiệu lực của link mời
                  </label>
                  <select
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-xs"
                  >
                    <option value={1}>1 ngày (24 giờ)</option>
                    <option value={3}>3 ngày</option>
                    <option value={7}>7 ngày (Khuyên dùng)</option>
                    <option value={30}>30 ngày</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateInviteLink}
                    disabled={linkLoading}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    <span>{linkLoading ? "Đang tạo link..." : "Tạo link mời nhóm"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium">
                  ✓ Link mời nhóm đã sẵn sàng! Bạn có thể gửi cho nhiều thành viên cùng tham gia.
                </div>

                {/* Shareable Link Box */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Đường dẫn tham gia trực tiếp (Khuyên dùng)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={getFullInviteUrl(
                        inviteResult.raw_token || inviteResult.invite_token || ""
                      )}
                      className="w-full font-mono text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 shadow-sm"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-300" />
                          <span>Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Chép link</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Người nhận chỉ cần nhấp vào liên kết này trên trình duyệt để vào nhóm ngay.
                  </p>
                </div>

                {/* Token Box */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mã mời nhóm (Dán vào ứng dụng)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteResult.raw_token || inviteResult.invite_token || ""}
                      className="w-full font-mono text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Chép mã</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p>
                    • Hạn dùng:{" "}
                    <span className="font-semibold text-slate-700">
                      {new Date(inviteResult.expires_at).toLocaleString("vi-VN")}
                    </span>
                  </p>
                  <p>• Dùng được cho nhiều người cùng lúc.</p>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setInviteResult(null);
                      setLinkError(null);
                    }}
                    className="text-xs text-indigo-600 hover:underline font-medium"
                  >
                    Tạo link mới khác
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
                  >
                    Xong
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
