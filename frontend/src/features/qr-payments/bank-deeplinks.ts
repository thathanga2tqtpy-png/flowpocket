// URL Schemes for Vietnamese Banking and E-Wallet Applications
export interface BankAppScheme {
  code: string;
  name: string;
  shortName: string;
  scheme: string;
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
    primaryColor: "bg-emerald-600 text-white",
  },
  {
    code: "MB",
    name: "MBBank",
    shortName: "MBBank",
    scheme: "mbcustomertransition://",
    primaryColor: "bg-blue-600 text-white",
  },
  {
    code: "TCB",
    name: "Techcombank Mobile",
    shortName: "Techcombank",
    scheme: "techcombank://",
    primaryColor: "bg-red-600 text-white",
  },
  {
    code: "BIDV",
    name: "BIDV SmartBanking",
    shortName: "BIDV",
    scheme: "bidvsmartbanking://",
    primaryColor: "bg-emerald-700 text-white",
  },
  {
    code: "VPB",
    name: "VPBank NEO",
    shortName: "VPBank",
    scheme: "vpbankneo://",
    primaryColor: "bg-emerald-500 text-white",
  },
  {
    code: "ACB",
    name: "ACB ONE",
    shortName: "ACB",
    scheme: "acbone://",
    primaryColor: "bg-blue-700 text-white",
  },
  {
    code: "TPB",
    name: "TPBank Mobile",
    shortName: "TPBank",
    scheme: "tpbank://",
    primaryColor: "bg-purple-600 text-white",
  },
  {
    code: "CTG",
    name: "VietinBank iPay",
    shortName: "VietinBank",
    scheme: "vietinbankipay://",
    primaryColor: "bg-sky-700 text-white",
  },
  {
    code: "MOMO",
    name: "Ví MoMo",
    shortName: "MoMo",
    scheme: "momo://",
    primaryColor: "bg-pink-600 text-white",
  },
  {
    code: "ZALOPAY",
    name: "ZaloPay",
    shortName: "ZaloPay",
    scheme: "zalopay://",
    primaryColor: "bg-blue-500 text-white",
  },
];

/**
 * Open bank app via deeplink / custom URL scheme
 */
export function openBankAppByScheme(scheme: string) {
  try {
    window.location.href = scheme;
  } catch (err) {
    console.error("Failed to trigger deeplink scheme:", err);
  }
}

