"use client";

import React from "react";
import {
  GroupDebtOverview,
  GroupSettlement,
  GroupDetail,
  DebtSimplificationItem,
} from "../types";
import { formatAuditDateTime, formatFullAuditTimestamp } from "@/lib/date-utils";
import { Check, X, ArrowLeftRight, Clock } from "lucide-react";

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
  const pendingForMe = settlements.filter(
    (s) => s.to_user_id === currentUserId && s.status === "PENDING",
  );

  const groupName =
    groupDetail.group?.name || groupDetail.name || "nhóm";

  return (
    <div className="space-y-4">
      {/* 1. KHOẢN TIỀN NGƯỜI KHÁC VỪA TRẢ ĐANG CHỜ BẠN XÁC NHẬN */}
      {pendingForMe.length > 0 && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
          <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-xs">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>Khoản tiền chờ bạn xác nhận ({pendingForMe.length})</span>
          </div>

          <div className="space-y-2">
            {pendingForMe.map((s) => (
              <div
                key={s.id}
                className="p-3 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
              >
                <div>
                  <div className="text-xs text-slate-700">
                    Thành viên <strong>{s.from_user_name}</strong> báo đã chuyển:
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    +{s.amount.toLocaleString("vi-VN")} đ
                  </div>
                  {s.note && (
                    <div className="text-xs text-slate-500 italic">
                      Ghi chú: {s.note}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-1 sm:pt-0">
                  <button
                    onClick={() => onRejectSettlement(s)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs transition"
                  >
                    Từ chối
                  </button>
                  <button
                    onClick={() => onConfirmSettlement(s)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-medium transition"
                  >
                    Xác nhận nhận tiền
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. THẺ TRẠNG THÁI CÔNG NỢ CỦA BẠN */}
      <div className="p-4 rounded-lg border border-slate-200 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <span className="text-xs text-slate-500 block mb-0.5">
            Trạng thái công nợ của bạn
          </span>
          <div className="text-sm sm:text-base font-bold text-slate-900">
            {debtsOverview.current_user_net > 0
              ? `Bạn được nhận lại: +${debtsOverview.current_user_net.toLocaleString("vi-VN")} đ`
              : debtsOverview.current_user_net < 0
                ? `Bạn cần trả nhóm: ${debtsOverview.current_user_net.toLocaleString("vi-VN")} đ`
                : "Bạn đã sòng phẳng với nhóm (0 đ)"}
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            {debtsOverview.current_user_net > 0
              ? "Các thành viên khác sẽ chuyển trả tiền cho bạn. Khi nhận được tiền, bạn bấm nút 'Đã nhận & Cộng vào ví' ở danh sách phía trên."
              : debtsOverview.current_user_net < 0
                ? "Vui lòng chuyển tiền cho các thành viên bên dưới và bấm nút 'Chuyển tiền trả nợ'."
                : "Không ai nợ bạn và bạn cũng không nợ ai trong nhóm này."}
          </p>
        </div>

        {debtsOverview.current_user_net < 0 ? (
          <button
            onClick={onOpenGeneralSettlement}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>Chuyển tiền trả nợ</span>
          </button>
        ) : debtsOverview.current_user_net > 0 ? (
          <button
            onClick={() => {
              const msg = `[FlowPocket] Nhắc nợ: Mình có khoản ứng trước +${debtsOverview.current_user_net.toLocaleString("vi-VN")} đ trong "${groupName}". Mọi người kiểm tra và chuyển khoản giúp mình nhé. Cảm ơn cả nhà.`;
              navigator.clipboard.writeText(msg);
              onShowNotification(
                "Đã sao chép tin nhắn nhắc nợ vào bộ nhớ tạm.",
              );
            }}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition shrink-0"
          >
            <span>Sao chép tin nhắn nhắc nợ</span>
          </button>
        ) : null}
      </div>

      {/* 3. GỢI Ý THANH TOÁN TỐI GIẢN (AI TRẢ AI ĐỂ HẾT NỢ NHÓM) */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-semibold text-slate-800 text-xs">
              Gợi ý thanh toán
            </h4>
            <p className="text-[11px] text-slate-400">
              Các khoản chuyển tiền để nhóm hết công nợ
            </p>
          </div>

          {debtsOverview.current_user_net < 0 ? (
            <button
              onClick={onOpenGeneralSettlement}
              className="text-xs text-slate-700 hover:underline font-medium flex items-center gap-1"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Chuyển trả tiền nợ
            </button>
          ) : debtsOverview.current_user_net > 0 ? (
            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Bạn là người nhận tiền
            </span>
          ) : (
            <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Đã sòng phẳng
            </span>
          )}
        </div>

        {debtsOverview.suggested_settlements.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            Tất cả thành viên hiện đã thanh toán sòng phẳng.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {debtsOverview.suggested_settlements.map((item, idx) => {
              const isMeDebtor = item.from_user_id === currentUserId;
              const isMeReceiver = item.to_user_id === currentUserId;

              return (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          isMeDebtor
                            ? "text-slate-900 font-semibold"
                            : "text-slate-700"
                        }
                      >
                        {item.from_user_name}
                        {isMeDebtor && " (Bạn)"}
                      </span>
                      <span className="text-slate-400">→</span>
                      <span
                        className={
                          isMeReceiver
                            ? "text-emerald-700 font-semibold"
                            : "text-slate-700"
                        }
                      >
                        {item.to_user_name}
                        {isMeReceiver && " (Bạn)"}
                      </span>
                    </div>

                    <span className="font-semibold text-xs text-slate-900">
                      {item.amount.toLocaleString("vi-VN")} đ
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-xs">
                    {isMeDebtor ? (
                      <button
                        onClick={() => onOpenSettlementFor(item)}
                        className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-medium text-center transition"
                      >
                        Chuyển {item.amount.toLocaleString("vi-VN")} đ cho{" "}
                        {item.to_user_name}
                      </button>
                    ) : isMeReceiver ? (
                      <div className="w-full flex justify-between items-center">
                        <span className="text-slate-500 text-xs">
                          Chờ {item.from_user_name} chuyển tiền
                        </span>
                        <button
                          onClick={() => {
                            const text = `FlowPocket: @${item.from_user_name} ơi, bạn có khoản cần chuyển ${item.amount.toLocaleString("vi-VN")} đ cho mình trong nhóm "${groupName}". Chuyển khoản giúp mình nhé!`;
                            navigator.clipboard.writeText(text);
                            onShowNotification(
                              `Đã sao chép tin nhắn nhắc ${item.from_user_name}!`,
                            );
                          }}
                          className="text-xs text-slate-600 hover:text-slate-900 underline font-medium"
                        >
                          Nhắc nợ
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">
                        Giao dịch nội bộ
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. LỊCH SỬ CHUYỂN TRẢ NỢ */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-sky-600" />
          Lịch sử chuyển trả nợ giữa các thành viên ({settlements.length})
        </h4>

        {settlements.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            Chưa có giao dịch quyết toán nào.
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
                  className="py-2.5 flex justify-between items-center gap-2 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800">
                        {s.from_user_name}
                      </span>
                      <span className="text-slate-400">→</span>
                      <span className="font-semibold text-slate-800">
                        {s.to_user_name}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
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
                    <div
                      className="text-[11px] text-slate-400"
                      title={`Thời gian tạo yêu cầu: ${formatFullAuditTimestamp(s.created_at)}`}
                    >
                      {formatAuditDateTime(s.created_at)}
                      {s.note && ` • ${s.note}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {s.amount.toLocaleString("vi-VN")} đ
                    </span>

                    {/* Recipient confirm/reject actions */}
                    {isPending && isReceiver && (
                      <div className="flex gap-1 pl-1">
                        <button
                          onClick={() => onConfirmSettlement(s)}
                          className="p-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded"
                          title="Xác nhận đã nhận tiền"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onRejectSettlement(s)}
                          className="p-1 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded"
                          title="Từ chối"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Sender cancel action */}
                    {isPending && isSender && (
                      <button
                        onClick={() => onCancelSettlement(s)}
                        className="text-[11px] text-slate-400 hover:text-rose-600 pl-1"
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

      {/* 5. BẢNG CÂN ĐỐI CÔNG NỢ TỪNG THÀNH VIÊN */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
          Bảng cân đối công nợ từng thành viên
        </h4>

        <div className="divide-y divide-slate-100 text-xs">
          {debtsOverview.members_balances.map((mb) => (
            <div
              key={mb.user_id}
              className="py-2 flex justify-between items-center"
            >
              <div>
                <div className="font-semibold text-slate-800">
                  {mb.full_name || mb.email}
                  {mb.user_id === currentUserId && (
                    <span className="text-[10px] ml-1.5 px-1 bg-slate-100 text-slate-500 rounded">
                      Bạn
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  Đã trả: {mb.total_paid.toLocaleString("vi-VN")} đ | Chịu:{" "}
                  {mb.total_share.toLocaleString("vi-VN")} đ
                </div>
              </div>

              <span
                className={`font-bold ${
                  mb.net_balance > 0
                    ? "text-emerald-700"
                    : mb.net_balance < 0
                      ? "text-rose-600"
                      : "text-slate-500"
                }`}
              >
                {mb.net_balance > 0
                  ? `+${mb.net_balance.toLocaleString("vi-VN")} đ`
                  : `${mb.net_balance.toLocaleString("vi-VN")} đ`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

