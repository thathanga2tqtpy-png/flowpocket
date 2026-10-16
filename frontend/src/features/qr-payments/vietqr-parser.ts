export interface ParsedVietQR {
  isValidVietQR: boolean;
  bankBin: string | null;
  bankCode: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountHolderName?: string | null;
  amount: number | null;
  memo: string | null;
  rawPayload: string;
}

// Bảng tra cứu toàn bộ ngân hàng & ví điện tử Việt Nam theo mã BIN chuẩn Napas/VietQR
export const VIETNAM_BANKS_BY_BIN: Record<string, { code: string; name: string }> = {
  "970415": { code: "ICB", name: "VietinBank" },
  "970436": { code: "VCB", name: "Vietcombank" },
  "970418": { code: "BIDV", name: "BIDV" },
  "970405": { code: "VBA", name: "Agribank" },
  "970448": { code: "OCB", name: "OCB" },
  "970422": { code: "MB", name: "MBBank" },
  "970407": { code: "TCB", name: "Techcombank" },
  "970416": { code: "ACB", name: "ACB" },
  "970432": { code: "VPB", name: "VPBank" },
  "970423": { code: "TPB", name: "TPBank" },
  "970403": { code: "STB", name: "Sacombank" },
  "970437": { code: "HDB", name: "HDBank" },
  "970454": { code: "VCCB", name: "BVBank (Bản Việt)" },
  "970429": { code: "SCB", name: "SCB" },
  "970441": { code: "VIB", name: "VIB" },
  "970443": { code: "SHB", name: "SHB" },
  "970431": { code: "EIB", name: "Eximbank" },
  "970426": { code: "MSB", name: "MSB" },
  "546034": { code: "CAKE", name: "Cake by VPBank" },
  "546035": { code: "UBANK", name: "Ubank by VPBank" },
  "963388": { code: "TIMO", name: "Timo by BVBank" },
  "971005": { code: "VTLMONEY", name: "Viettel Money" },
  "971011": { code: "VNPTMONEY", name: "VNPT Money" },
  "970400": { code: "SGICB", name: "SaigonBank" },
  "970409": { code: "BAB", name: "BacABank" },
  "971133": { code: "PVDB", name: "PVcomBank Pay" },
  "971025": { code: "MOMO", name: "Ví MoMo" },
  "970412": { code: "PVCB", name: "PVcomBank" },
  "970414": { code: "MBV", name: "MBV" },
  "970419": { code: "NCB", name: "NCB" },
  "970424": { code: "SHBVN", name: "Shinhan Bank" },
  "970425": { code: "ABB", name: "ABBANK" },
  "970427": { code: "VAB", name: "VietABank" },
  "970428": { code: "NAB", name: "NamABank" },
  "970430": { code: "PGB", name: "PGBank" },
  "970433": { code: "VIETBANK", name: "VietBank" },
  "970438": { code: "BVB", name: "BaoVietBank" },
  "970440": { code: "SEAB", name: "SeABank" },
  "970446": { code: "COOPBANK", name: "COOPBANK" },
  "970449": { code: "LPB", name: "LPBank" },
  "970452": { code: "KLB", name: "KienLongBank" },
  "668888": { code: "KBANK", name: "KBank" },
  "970466": { code: "KEBHANAHCM", name: "KEBHana HCM" },
  "970467": { code: "KEBHANAHN", name: "KEBHana Hà Nội" },
  "977777": { code: "MAFC", name: "Mirae Asset" },
  "999888": { code: "VBSP", name: "VBSP (CSXH)" },
  "971101": { code: "ZALOPAY", name: "Ví ZaloPay" },
  "963326": { code: "TNEX", name: "TNEX by MSB" },
  "458761": { code: "HSBC", name: "HSBC Việt Nam" },
  "970442": { code: "HLBVN", name: "Hong Leong Bank" },
  "970434": { code: "IVB", name: "IndovinaBank" },
  "970406": { code: "VIKKI", name: "Ngân hàng số Vikki" },
  "970439": { code: "PBVN", name: "PublicBank" },
  "970410": { code: "SCVN", name: "Standard Chartered" },
  "533948": { code: "CITIBANK", name: "Citibank" },
  "422589": { code: "CIMB", name: "CIMB Việt Nam" },
  "970458": { code: "UOB", name: "United Overseas Bank" },
  "970444": { code: "CBB", name: "CBBank" },
  "970408": { code: "GPB", name: "GPBank" },
  "970421": { code: "VRB", name: "VRB" },
  "970457": { code: "WVN", name: "Woori Bank" },
  "970462": { code: "KBHN", name: "Kookmin Hà Nội" },
  "970463": { code: "KBHCM", name: "Kookmin HCM" },
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
    accountHolderName: null,
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

  // Tag 59: Merchant / Beneficiary Name
  if (tlv["59"]) {
    result.accountHolderName = tlv["59"].trim();
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
