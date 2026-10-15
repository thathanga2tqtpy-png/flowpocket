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
];

export interface BankTransferDetails {
  bankCode?: string | null;
  bankBin?: string | null;
  accountNumber?: string | null;
  amount?: number | null;
  memo?: string | null;
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
    const targetBankIdentifier = transferDetails.bankBin || transferDetails.bankCode!.toLowerCase();
    const ba = `${transferDetails.accountNumber}@${targetBankIdentifier}`;
    const params = new URLSearchParams({
      app: appId,
      ba: ba,
    });

    if (transferDetails.amount && transferDetails.amount > 0) {
      params.set("am", Math.round(transferDetails.amount).toString());
    }

    if (transferDetails.memo && transferDetails.memo.trim()) {
      params.set("tn", transferDetails.memo.trim());
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
