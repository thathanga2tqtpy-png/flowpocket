import { apiRequest } from "@/lib/api-client";
import {
  Wallet,
  Category,
  Transaction,
  FinancialSummary,
} from "./types";

export interface CreateWalletPayload {
  name: string;
  wallet_type: string;
  currency?: string;
  opening_balance?: number;
  bank_code?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  account_holder_name?: string | null;
}

export interface UpdateWalletPayload {
  name?: string;
  wallet_type?: string;
  is_archived?: boolean;
  bank_code?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  account_holder_name?: string | null;
}

export interface CreateTransactionPayload {
  wallet_id: string;
  transaction_type: string;
  amount: number;
  category_id?: string | null;
  description?: string | null;
  transaction_date: string;
}

export interface TransferPayload {
  source_wallet_id: string;
  destination_wallet_id: string;
  amount: number;
  description?: string;
  transaction_date: string;
}

export const personalFinanceService = {
  // Wallets
  getWallets: async (includeArchived: boolean = false) => {
    return apiRequest<Wallet[]>(`/api/v1/wallets?include_archived=${includeArchived}`);
  },

  createWallet: async (data: CreateWalletPayload) => {
    return apiRequest<Wallet>("/api/v1/wallets", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateWallet: async (id: string, data: UpdateWalletPayload) => {
    return apiRequest<Wallet>(`/api/v1/wallets/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteWallet: async (id: string) => {
    return apiRequest<void>(`/api/v1/wallets/${id}`, {
      method: "DELETE",
    });
  },

  // Categories
  getCategories: async () => {
    return apiRequest<Category[]>("/api/v1/categories");
  },

  // Transactions
  getTransactions: async (params?: URLSearchParams) => {
    const qs = params ? `?${params.toString()}` : "";
    return apiRequest<Transaction[]>(`/api/v1/transactions${qs}`);
  },

  createTransaction: async (data: CreateTransactionPayload) => {
    return apiRequest<Transaction>("/api/v1/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateTransaction: async (id: string, data: Partial<CreateTransactionPayload>) => {
    return apiRequest<Transaction>(`/api/v1/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteTransaction: async (id: string) => {
    return apiRequest<void>(`/api/v1/transactions/${id}`, {
      method: "DELETE",
    });
  },

  // Transfer
  transfer: async (data: TransferPayload) => {
    return apiRequest<{ source_transaction: Transaction; destination_transaction: Transaction }>(
      "/api/v1/transactions/transfer",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  // Financial Summary
  getFinancialSummary: async (params?: URLSearchParams) => {
    const qs = params ? `?${params.toString()}` : "";
    return apiRequest<FinancialSummary>(`/api/v1/transactions/summary${qs}`);
  },

  // User Groups (for personal dashboard source filter)
  getGroups: async () => {
    return apiRequest<any[]>("/api/v1/groups");
  },
};

