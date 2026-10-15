export interface ParsedVietQR {
  isValidVietQR: boolean;
  bankBin: string | null;
  bankCode: string | null;
  bankName: string | null;
  accountNumber: string | null;
  amount: number | null;
  memo: string | null;
  rawPayload: string;
}

// Bảng tra cứu mã BIN ngân hàng Việt Nam
export const VIETNAM_BANKS_BY_BIN: Record<string, { code: string; name: string }> = {
  "970436": { code: "VCB", name: "Vietcombank" },
  "970407": { code: "TCB", name: "Techcombank" },
  "970422": { code: "MB", name: "MBBank" },
  "970415": { code: "ICB", name: "VietinBank" },
  "970418": { code: "BIDV", name: "BIDV" },
  "970416": { code: "ACB", name: "ACB" },
  "970432": { code: "VPB", name: "VPBank" },
  "970423": { code: "TPB", name: "TPBank" },
  "970403": { code: "STB", name: "Sacombank" },
  "970437": { code: "HDB", name: "HDBank" },
  "970441": { code: "VIB", name: "VIB" },
  "970443": { code: "SHB", name: "SHB" },
  "970448": { code: "OCB", name: "OCB" },
  "970426": { code: "MSB", name: "MSB" },
  "970449": { code: "LPB", name: "LPBank" },
  "970440": { code: "SEAB", name: "SeABank" },
  "970427": { code: "VAB", name: "VietABank" },
  "970438": { code: "BVB", name: "BaoVietBank" },
  "970452": { code: "KLB", name: "KienLongBank" },
  "546034": { code: "CAKE", name: "Cake by VPBank" },
  "963388": { code: "TIMO", name: "Timo by BVBank" },
  "970454": { code: "BVBANK", name: "BVBank (Bản Việt)" },
};

export function parseTLV(payload: string): Record<string, string> {
  const result: Record<string, string> = {};
  let idx = 0;
  while (idx + 4 <= payload.length) {
    const tag = payload.substring(idx, idx + 2);
    const length = parseInt(payload.substring(idx + 2, idx + 4), 10);
    idx += 4;
    if (isNaN(length) || idx + length > payload.length) break;
    const value = payload.substring(idx, idx + length);
    idx += length;
    result[tag] = value;
  }
  return result;
}

export function parseVietQRPayload(rawPayload: string): ParsedVietQR {
  const clean = rawPayload.trim();
  const tlv = parseTLV(clean);

  const result: ParsedVietQR = {
    isValidVietQR: false,
    bankBin: null,
    bankCode: null,
    bankName: null,
    accountNumber: null,
    amount: null,
    memo: null,
    rawPayload: clean,
  };

  // Tag 38: Napas / VietQR Info
  if (tlv["38"]) {
    const sub38 = parseTLV(tlv["38"]);
    // Napas AID: A000000727
    if (sub38["00"] === "A000000727" && sub38["01"]) {
      const beneficiary = parseTLV(sub38["01"]);
      const bin = beneficiary["00"] || null;
      const accountNo = beneficiary["01"] || null;
      result.bankBin = bin;
      result.accountNumber = accountNo;
      result.isValidVietQR = true;

      if (bin && VIETNAM_BANKS_BY_BIN[bin]) {
        result.bankCode = VIETNAM_BANKS_BY_BIN[bin].code;
        result.bankName = VIETNAM_BANKS_BY_BIN[bin].name;
      }
    }
  }

  // Tag 54: Amount
  if (tlv["54"]) {
    const parsedAmount = parseInt(tlv["54"], 10);
    if (!isNaN(parsedAmount) && parsedAmount > 0) {
      result.amount = parsedAmount;
    }
  }

  // Tag 62: Additional Data (Memo in Sub-tag 08)
  if (tlv["62"]) {
    const sub62 = parseTLV(tlv["62"]);
    if (sub62["08"]) {
      result.memo = sub62["08"];
    }
  }

  return result;
}

