/**
 * Tiện ích định dạng ngày giờ chuẩn kiểm toán tài chính (Audit Trail DateTime)
 */

/**
 * Định dạng ngày giờ rõ ràng gồm Giờ:Phút, Ngày/Tháng/Năm
 * Ví dụ: "14:35, 15/10/2026"
 */
export function formatAuditDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";

  const time = d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const date = d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `${time}, ${date}`;
}

/**
 * Định dạng rút gọn: Giờ:Phút • Ngày/Tháng
 * Ví dụ: "14:35 • 15/10"
 */
export function formatAuditShort(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";

  const time = d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");

  return `${time} • ${day}/${month}`;
}

/**
 * Định dạng chi tiết chính xác đến từng giây phục vụ đối soát và hover tooltip
 * Ví dụ: "14:35:28, 15/10/2026"
 */
export function formatFullAuditTimestamp(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";

  const time = d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const date = d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `${time}, ${date}`;
}

