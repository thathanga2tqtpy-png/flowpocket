// URL Schemes & Universal Deeplinks for Vietnamese Banking and E-Wallet Applications
export interface BankAppScheme {
  code: string;
  name: string;
  shortName: string;
  scheme: string;
  vietqrAppId?: string; // VietQR dl.vietqr.io app code
  androidPackage?: string;
  iosAppStoreId?: string;
  primaryColor: string;
}

export const POPULAR_BANK_APPS: BankAppScheme[] = [
  {
    code: "VCB",
    name: "Vietcombank (VCB Digibank)",
    shortName: "Vietcombank",
    scheme: "vietcombank://",
    vietqrAppId: "vcb",
    primaryColor: "bg-emerald-600 text-white",
  },
  {
    code: "MB",
    name: "MBBank",
    shortName: "MBBank",
    scheme: "mbcustomertransition://",
    vietqrAppId: "mb",
    primaryColor: "bg-blue-600 text-white",
  },
  {
    code: "TCB",
    name: "Techcombank Mobile",
    shortName: "Techcombank",
    scheme: "techcombank://",
    vietqrAppId: "tcb",
    primaryColor: "bg-red-600 text-white",
  },
  {
    code: "BIDV",
    name: "BIDV SmartBanking",
    shortName: "BIDV",
    scheme: "bidvsmartbanking://",
    vietqrAppId: "bidv",
    primaryColor: "bg-emerald-700 text-white",
  },
  {
    code: "VPB",
    name: "VPBank NEO",
    shortName: "VPBank",
    scheme: "vpbankneo://",
    vietqrAppId: "vpb",
    primaryColor: "bg-emerald-500 text-white",
  },
  {
    code: "ACB",
    name: "ACB ONE",
    shortName: "ACB",
    scheme: "acbone://",
    vietqrAppId: "acb",
    primaryColor: "bg-blue-700 text-white",
  },
  {
    code: "TPB",
    name: "TPBank Mobile",
    shortName: "TPBank",
    scheme: "tpbank://",
    vietqrAppId: "tpb",
    primaryColor: "bg-purple-600 text-white",
  },
  {
    code: "CTG",
    name: "VietinBank iPay",
    shortName: "VietinBank",
    scheme: "vietinbankipay://",
    vietqrAppId: "icb",
    primaryColor: "bg-sky-700 text-white",
  },
  {
    code: "ICB",
    name: "VietinBank iPay",
    shortName: "VietinBank",
    scheme: "vietinbankipay://",
    vietqrAppId: "icb",
    primaryColor: "bg-sky-700 text-white",
  },
  {
    code: "VIB",
    name: "MyVIB",
    shortName: "VIB",
    scheme: "myvib://",
    vietqrAppId: "vib",
    primaryColor: "bg-blue-600 text-white",
  },
  {
    code: "STB",
    name: "Sacombank mBanking",
    shortName: "Sacombank",
    scheme: "sacombank://",
    vietqrAppId: "stb",
    primaryColor: "bg-blue-800 text-white",
  },
  {
    code: "OCB",
    name: "OCB OMNI",
    shortName: "OCB",
    scheme: "ocbomni://",
    vietqrAppId: "ocb",
    primaryColor: "bg-green-700 text-white",
  },
  {
    code: "HDB",
    name: "HDBank",
    shortName: "HDBank",
    scheme: "hdbank://",
    vietqrAppId: "hdb",
    primaryColor: "bg-red-600 text-white",
  },
  {
    code: "MOMO",
    name: "Ví MoMo",
    shortName: "MoMo",
    scheme: "momo://",
    vietqrAppId: "momo",
    primaryColor: "bg-pink-600 text-white",
  },
  {
    code: "ZALOPAY",
    name: "ZaloPay",
    shortName: "ZaloPay",
    scheme: "zalopay://",
    vietqrAppId: "zalopay",
    primaryColor: "bg-blue-500 text-white",
  },
  {
    code: "SHBVN",
    name: "Shinhan SOL Việt Nam",
    shortName: "Shinhan Bank",
    scheme: "shinhansolvietnam://",
    vietqrAppId: "shbvn",
    androidPackage: "com.shinhan.smartcarevn",
    iosAppStoreId: "1456184967",
    primaryColor: "bg-sky-600 text-white",
  },
];

export interface BankTransferDetails {
  bankCode?: string | null;
  bankBin?: string | null;
  accountNumber?: string | null;
  accountHolderName?: string | null;
  amount?: number | null;
  memo?: string | null;
}

/**
 * Sanitize transaction note strictly according to Napas VietQR specification:
 * - Unaccented Latin characters (A-Z, a-z, 0-9)
 * - No special characters or accented Vietnamese
 * - Max length 25 characters (recommended 19)
 */
export function sanitizeTransactionNote(str?: string | null): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 20);
}

/**
 * Generate VietQR App-to-App deep link that opens the bank app
 * and PRE-FILLS all transfer fields (beneficiary account, bank, amount, memo)
 * exactly like Zalo / Banking QR scanner does.
 */
export function buildBankAppDeepLink(
  bankConfig: BankAppScheme,
  transferDetails?: BankTransferDetails
): string {
  const appId = bankConfig.vietqrAppId || bankConfig.code.toLowerCase();

  // If transfer details with beneficiary account and bank are available, use Napas VietQR Universal Deep Link
  if (transferDetails?.accountNumber && (transferDetails.bankBin || transferDetails.bankCode)) {
    // Napas / VietQR expects the beneficiary bank code (e.g. shbvn, mb, vcb, or bank BIN e.g. 970424)
    const targetBankIdentifier = (transferDetails.bankCode || transferDetails.bankBin)!.toLowerCase();
    const cleanAccount = transferDetails.accountNumber.replace(/[^a-zA-Z0-9]/g, "");
    const ba = `${cleanAccount}@${targetBankIdentifier}`;
    
    const params = new URLSearchParams({
      app: appId,
      ba: ba,
    });

    if (transferDetails.amount && transferDetails.amount > 0) {
      params.set("am", Math.round(transferDetails.amount).toString());
    }

    const cleanNote = sanitizeTransactionNote(transferDetails.memo);
    if (cleanNote) {
      params.set("tn", cleanNote);
    }

    if (transferDetails.accountHolderName && transferDetails.accountHolderName.trim()) {
      const cleanName = sanitizeTransactionNote(transferDetails.accountHolderName);
      if (cleanName) {
        params.set("bn", cleanName);
      }
    }

    // Callback URL to bring user back to FlowPocket after transaction
    if (typeof window !== "undefined") {
      params.set("url", window.location.origin);
    }

    // https://dl.vietqr.io/pay triggers universal app-to-app launch with pre-filled fields
    return `https://dl.vietqr.io/pay?${params.toString()}`;
  }

  // Fallback to custom URL scheme
  return bankConfig.scheme;
}

/**
 * Open bank app with pre-filled transfer data
 */
export function openBankAppByScheme(
  bankConfigOrScheme: BankAppScheme | string,
  transferDetails?: BankTransferDetails
) {
  try {
    let targetUrl: string;

    if (typeof bankConfigOrScheme === "string") {
      targetUrl = bankConfigOrScheme;
    } else {
      targetUrl = buildBankAppDeepLink(bankConfigOrScheme, transferDetails);
    }

    window.location.href = targetUrl;
  } catch (err) {
    console.error("Failed to trigger deeplink scheme:", err);
  }
}
