/**
 * Chuyển đổi số tiền thành chữ Tiếng Việt chuẩn.
 * Ví dụ:
 *   150000 -> "Một trăm năm mươi nghìn đồng"
 *   1500000 -> "Một triệu năm trăm nghìn đồng"
 */

const DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

function readThreeDigits(threeDigits: number, hasHigherGroup: boolean): string {
  const hundreds = Math.floor(threeDigits / 100);
  const remainder = threeDigits % 100;
  const tens = Math.floor(remainder / 10);
  const units = remainder % 10;

  const parts: string[] = [];

  // Đọc hàng trăm
  if (hundreds > 0 || hasHigherGroup) {
    parts.push(`${DIGITS[hundreds]} trăm`);
  }

  // Đọc hàng chục
  if (tens > 1) {
    parts.push(`${DIGITS[tens]} mươi`);
  } else if (tens === 1) {
    parts.push("mười");
  } else if (hundreds > 0 || hasHigherGroup) {
    if (units > 0) {
      parts.push("lẻ");
    }
  }

  // Đọc hàng đơn vị
  if (tens > 0 && units === 1) {
    if (tens === 1) {
      parts.push("một");
    } else {
      parts.push("mốt");
    }
  } else if (tens > 0 && units === 5) {
    parts.push("lăm");
  } else if (units > 0 || (hundreds === 0 && tens === 0 && !hasHigherGroup)) {
    parts.push(DIGITS[units]);
  }

  return parts.join(" ");
}

const SCALE_NAMES = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

export function numberToVietnameseWords(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return "";
  }

  const rounded = Math.round(Math.abs(amount));
  if (rounded === 0) {
    return "Không đồng";
  }

  if (rounded > 1000_000_000_000_000) {
    return "Số tiền quá lớn";
  }

  // Chia thành từng nhóm 3 chữ số (từ phải sang trái)
  const groups: number[] = [];
  let temp = rounded;
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  const resultParts: string[] = [];

  for (let i = groups.length - 1; i >= 0; i--) {
    const groupValue = groups[i];
    if (groupValue === 0) continue;

    const hasHigherGroup = i < groups.length - 1;
    const groupText = readThreeDigits(groupValue, hasHigherGroup);
    const scale = SCALE_NAMES[i];

    if (scale) {
      resultParts.push(`${groupText} ${scale}`);
    } else {
      resultParts.push(groupText);
    }
  }

  const fullText = resultParts.join(" ").trim();
  if (!fullText) return "Không đồng";

  // Viết hoa chữ cái đầu và thêm đuôi "đồng"
  const capitalized = fullText.charAt(0).toUpperCase() + fullText.slice(1);
  return `${capitalized} đồng`;
}

