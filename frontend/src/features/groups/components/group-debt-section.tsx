"use client";

import React, { useState } from "react";
import {
  GroupDebtOverview,
  GroupSettlement,
  GroupDetail,
  DebtSimplificationItem,
} from "../types";
import { formatAuditDateTime, formatFullAuditTimestamp } from "@/lib/date-utils";
import {
  Check,
  X,
  ArrowRight,
  Clock,
  BellRing,
  CheckCircle2,
  Users,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Copy,
  ArrowLeftRight,
} from "lucide-react";

interface GroupDebtSectionProps {
  debtsOverview: GroupDebtOverview;
  settlements: GroupSettlement[];
  groupDetail: GroupDetail;
  currentUserId?: string;
  onConfirmSettlement: (s: GroupSettlement) => void;
  onRejectSettlement: (s: GroupSettlement) => void;
  onCancelSettlement: (s: GroupSettlement) => void;
  onOpenSettlementFor: (item: DebtSimplificationItem) => void;
  onOpenGeneralSettlement: () => void;
  onShowNotification: (msg: string) => void;
}

export function GroupDebtSection({
  debtsOverview,
  settlements,
  groupDetail,
  currentUserId,
  onConfirmSettlement,
  onRejectSettlement,
  onCancelSettlement,
  onOpenSettlementFor,
  onOpenGeneralSettlement,
  onShowNotification,
}: GroupDebtSectionProps) {
  // Accordion toggles cho các mục phụ
  const [showBalanceTable, setShowBalanceTable] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const pendingForMe = settlements.filter(
    (s) => s.to_user_id === currentUserId && s.status === "PENDING"
  );

  const groupName = groupDetail.group?.name || groupDetail.name || "nhóm";
  const userNet = debtsOverview.current_user_net || 0;

  const formatVND = (v: number) =>
    Math.abs(v).toLocaleString("vi-VN") + " đ";

  const allDebts = debtsOverview.suggested_settlements || [];

  return (
    <div className="space-y-3.5">
      {/* 1. THÔNG BÁO: Khoản tiền người khác vừa chuyển trả đang chờ duyệt (Ưu tiên số 1) */}
      {pendingForMe.length > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2.5 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-bold text-amber-900">
            <span className="flex items-center gap-1.5">
              <BellRing className="h-4 w-4 text-amber-600 animate-bounce" />
              Bạn có {pendingForMe.length} khoản tiền thành viên báo đã trả:
            </span>
          </div>

          <div className="space-y-2">
            {pendingForMe.map((s) => (
              <div
                key={s.id}
                className="p-3 bg-white rounded-xl border border-amber-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs shadow-2xs"
              >
                <div>
                  <div className="text-slate-800">
                    Thành viên <strong>{s.from_user_name}</strong> báo đã chuyển:{" "}
                    <strong className="text-emerald-600 text-sm">+{formatVND(s.amount)}</strong>
                  </div>
                  {s.note && (
                    <div className="text-[11px] text-slate-500 italic mt-0.5">
                      Ghi chú: {s.note}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-1 sm:pt-0">
                  <button
                    onClick={() => onRejectSettlement(s)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs transition cursor-pointer"
                  >
                    Chưa nhận
                  </button>
                  <button
                    onClick={() => onConfirmSettlement(s)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    Đã nhận & Cộng ví
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. DANH SÁCH CÔNG NỢ TINH GỌN (Phong cách tinh tế, nền trắng, viền nhạt) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ArrowLeftRight className="h-3.5 w-3.5 text-slate-500" />
              <span>Công nợ cần thanh toán ({allDebts.length})</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Các khoản thanh toán trực tiếp để nhóm sòng phẳng
            </p>
          </div>

          <button
            onClick={onOpenGeneralSettlement}
            className="text-[11px] text-slate-500 hover:text-slate-800 font-medium cursor-pointer flex items-center gap-1"
          >
            <span>Tự ghi nhận</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {allDebts.length === 0 ? (
          <div className="py-7 text-center space-y-1.5">
            <div className="h-9 w-9 mx-auto rounded-full bg-slate-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-700">
              Nhóm đã sòng phẳng!
            </p>
            <p className="text-[11px] text-slate-400">
              Hiện tại không có thành viên nào nợ tiền trong nhóm.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {allDebts.map((item, idx) => {
              const isMeDebtor = item.from_user_id === currentUserId;
              const isMeReceiver = item.to_user_id === currentUserId;

              // Lấy chữ cái đầu làm avatar tối giản
              const otherPersonName = isMeDebtor
                ? item.to_user_name
                : isMeReceiver
                ? item.from_user_name
                : `${item.from_user_name} → ${item.to_user_name}`;

              const initials = otherPersonName
                .split(" ")
                .map((n) => n[0])
                .slice(-2)
                .join("")
                .toUpperCase();

              return (
                <div
                  key={idx}
                  className="py-3.5 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                >
                  {/* Trái: Avatar + Tên người giao dịch */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isMeDebtor
                          ? "bg-rose-50 text-rose-600 border border-rose-100"
                          : isMeReceiver
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {initials}
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        {isMeDebtor ? (
                          <>
                            <span>Chuyển cho:</span>
                            <span className="text-slate-900 font-extrabold">{item.to_user_name}</span>
                          </>
                        ) : isMeReceiver ? (
                          <>
                            <span className="text-slate-900 font-extrabold">{item.from_user_name}</span>
                            <span className="text-slate-400 font-normal">nợ bạn</span>
                          </>
                        ) : (
                          <>
                            <span>{item.from_user_name}</span>
                            <ArrowRight className="h-3 w-3 text-slate-300" />
                            <span>{item.to_user_name}</span>
                          </>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400">
                        {isMeDebtor
                          ? "Khoản nợ bạn cần thanh toán"
                          : isMeReceiver
                          ? "Thành viên này cần chuyển trả cho bạn"
                          : "Khoản nợ nội bộ giữa các thành viên"}
                      </div>
                    </div>
                  </div>

                  {/* Phải: Số tiền + Nút hành động nhã nhặn */}
                  <div className="flex items-center justify-between sm:justify-end gap-3.5 pl-12 sm:pl-0">
                    <span
                      className={`text-sm sm:text-base font-bold ${
                        isMeDebtor
                          ? "text-rose-600"
                          : isMeReceiver
                          ? "text-emerald-700"
                          : "text-slate-800"
                      }`}
                    >
                      {isMeReceiver ? "+" : isMeDebtor ? "-" : ""}
                      {formatVND(item.amount)}
                    </span>

                    {/* Nút hành động thanh lịch */}
                    {isMeDebtor ? (
                      <button
                        onClick={() => onOpenSettlementFor(item)}
                        className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
                      >
                        <CreditCard className="h-3.5 w-3.5 text-slate-300" />
                        <span>Trả nợ</span>
                      </button>
                    ) : isMeReceiver ? (
                      <button
                        onClick={() => {
                          const text = `FlowPocket: @${item.from_user_name} ơi, bạn có khoản cần chuyển ${formatVND(
                            item.amount
                          )} cho mình trong nhóm "${groupName}". Chuyển khoản giúp mình nhé! Cảm ơn bạn.`;
                          navigator.clipboard.writeText(text);
                          onShowNotification(`Đã sao chép tin nhắn nhắc ${item.from_user_name}!`);
                        }}
                        className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer active:scale-98"
                      >
                        <Copy className="h-3.5 w-3.5 text-slate-400" />
                        <span>Nhắc nợ</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. BẢNG TỔNG KẾT CHI - THU (Accordion Thu Gọn Mặc Định) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => setShowBalanceTable(!showBalanceTable)}
          className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            <span>Bảng tổng kết chi tiêu từng người</span>
            <span className="text-[11px] font-normal text-slate-400">
              ({debtsOverview.members_balances.length} thành viên)
            </span>
          </span>
          {showBalanceTable ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>

        {showBalanceTable && (
          <div className="px-4 pb-4 pt-1 border-t border-slate-100 divide-y divide-slate-100 text-xs animate-in fade-in duration-150">
            {debtsOverview.members_balances.map((mb) => (
              <div
                key={mb.user_id}
                className="py-2.5 flex justify-between items-center"
              >
                <div>
                  <div className="font-semibold text-slate-800">
                    {mb.full_name || mb.email}
                    {mb.user_id === currentUserId && (
                      <span className="text-[10px] ml-1.5 px-1.5 py-0.2 bg-indigo-50 text-indigo-600 font-bold rounded-full border border-indigo-100">
                        Bạn
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Đã ứng: {formatVND(mb.total_paid)} • Phần phải chịu:{" "}
                    {formatVND(mb.total_share)}
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`font-black ${
                      mb.net_balance > 0
                        ? "text-emerald-700"
                        : mb.net_balance < 0
                        ? "text-rose-600"
                        : "text-slate-500"
                    }`}
                  >
                    {mb.net_balance > 0
                      ? `+${formatVND(mb.net_balance)}`
                      : mb.net_balance < 0
                      ? `-${formatVND(mb.net_balance)}`
                      : "0 đ"}
                  </span>
                  <div className="text-[10px] text-slate-400">
                    {mb.net_balance > 0
                      ? "Được nhận"
                      : mb.net_balance < 0
                      ? "Cần trả"
                      : "Sòng phẳng"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. LỊCH SỬ CHUYỂN TRẢ NỢ (Accordion Thu Gọn Mặc Định) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-500" />
            <span>Lịch sử các lần chuyển trả nợ</span>
            <span className="text-[11px] font-normal text-slate-400">
              ({settlements.length} giao dịch)
            </span>
          </span>
          {showHistory ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>

        {showHistory && (
          <div className="px-4 pb-4 pt-1 border-t border-slate-100 text-xs animate-in fade-in duration-150">
            {settlements.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Chưa có giao dịch chuyển trả nợ nào.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {settlements.map((s) => {
                  const isReceiver = s.to_user_id === currentUserId;
                  const isSender = s.from_user_id === currentUserId;
                  const isPending = s.status === "PENDING";

                  return (
                    <div
                      key={s.id}
                      className="py-3 flex justify-between items-center gap-2 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <span>{s.from_user_name}</span>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          <span>{s.to_user_name}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              s.status === "CONFIRMED"
                                ? "bg-emerald-100 text-emerald-800"
                                : s.status === "PENDING"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {s.status === "CONFIRMED"
                              ? "Đã xác nhận"
                              : s.status === "PENDING"
                              ? "Chờ xác nhận"
                              : s.status === "REJECTED"
                              ? "Đã từ chối"
                              : "Đã hủy"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {formatAuditDateTime(s.created_at)}
                          {s.note && ` • "${s.note}"`}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">
                          {formatVND(s.amount)}
                        </span>

                        {isPending && isReceiver && (
                          <div className="flex gap-1 pl-1">
                            <button
                              onClick={() => onConfirmSettlement(s)}
                              className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg cursor-pointer"
                              title="Xác nhận đã nhận tiền"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => onRejectSettlement(s)}
                              className="p-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg cursor-pointer"
                              title="Từ chối"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}

                        {isPending && isSender && (
                          <button
                            onClick={() => onCancelSettlement(s)}
                            className="text-[11px] text-slate-400 hover:text-rose-600 pl-1 cursor-pointer"
                          >
                            Hủy
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
