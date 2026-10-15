import { apiRequest } from "@/lib/api-client";
import {
  SupportedBank,
  ReceivingAccount,
  IncomingPaymentRequest,
  PaymentReconciliation,
  OutgoingPaymentRequest,
} from "./types";

export const qrPaymentService = {
  // Banks
  getSupportedBanks: async () => {
    return apiRequest<SupportedBank[]>("/api/v1/qr-payments/banks");
  },

  // Receiving accounts
  getReceivingAccounts: async (activeOnly: boolean = true) => {
    return apiRequest<ReceivingAccount[]>(
      `/api/v1/qr-payments/receiving-accounts?active_only=${activeOnly}`
    );
  },

  createReceivingAccount: async (data: {
    bank_code: string;
    account_number: string;
    account_holder_name: string;
    display_name?: string;
    linked_wallet_id?: string;
    is_default?: boolean;
  }) => {
    return apiRequest<ReceivingAccount>("/api/v1/qr-payments/receiving-accounts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateReceivingAccount: async (
    id: string,
    data: {
      bank_code?: string;
      account_number?: string;
      account_holder_name?: string;
      display_name?: string;
      linked_wallet_id?: string | null;
      is_default?: boolean;
      is_active?: boolean;
    }
  ) => {
    return apiRequest<ReceivingAccount>(`/api/v1/qr-payments/receiving-accounts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteReceivingAccount: async (id: string) => {
    return apiRequest<{ message: string }>(`/api/v1/qr-payments/receiving-accounts/${id}`, {
      method: "DELETE",
    });
  },

  // Incoming payment requests
  createPaymentRequest: async (data: {
    receiving_account_id?: string;
    target_wallet_id: string;
    expected_amount: number;
    category_id?: string;
    description?: string;
    transfer_memo?: string;
    allow_flexible_amount?: boolean;
  }) => {
    return apiRequest<IncomingPaymentRequest>("/api/v1/qr-payments/requests", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  listPaymentRequests: async (status?: string, limit: number = 50, offset: number = 0) => {
    let url = `/api/v1/qr-payments/requests?limit=${limit}&offset=${offset}`;
    if (status) {
      url += `&status=${status}`;
    }
    return apiRequest<{ items: IncomingPaymentRequest[]; total: number }>(url);
  },

  getPaymentRequest: async (id: string) => {
    return apiRequest<IncomingPaymentRequest>(`/api/v1/qr-payments/requests/${id}`);
  },

  cancelPaymentRequest: async (id: string) => {
    return apiRequest<IncomingPaymentRequest>(`/api/v1/qr-payments/requests/${id}/cancel`, {
      method: "POST",
    });
  },

  confirmPaymentReceived: async (
    id: string,
    data: {
      actual_amount: number;
      category_id?: string;
      notes?: string;
    }
  ) => {
    return apiRequest<IncomingPaymentRequest>(`/api/v1/qr-payments/requests/${id}/confirm`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Reconciliations
  listReconciliations: async (status?: string) => {
    let url = "/api/v1/qr-payments/reconciliations";
    if (status) {
      url += `?status=${status}`;
    }
    return apiRequest<PaymentReconciliation[]>(url);
  },

  updateReconciliation: async (
    id: string,
    data: {
      status?: string;
      notes?: string;
    }
  ) => {
    return apiRequest<PaymentReconciliation>(`/api/v1/qr-payments/reconciliations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Parse QR code
  parseQRCode: async (qrPayload: string) => {
    return apiRequest<{
      is_valid_vietqr: boolean;
      bank_bin: string | null;
      bank_code: string | null;
      bank_name: string | null;
      account_number: string | null;
      amount: number | null;
      memo: string | null;
      raw_payload: string;
    }>("/api/v1/qr-payments/parse", {
      method: "POST",
      body: JSON.stringify({ qr_payload: qrPayload }),
    });
  },

  // Outgoing Payments (Pending Expenses)
  createOutgoingPayment: async (data: {
    wallet_id: string;
    category_id?: string | null;
    amount: number;
    description?: string;
    bank_code?: string;
    bank_name?: string;
    account_number?: string;
    account_holder_name?: string;
    qr_payload?: string;
  }) => {
    return apiRequest<OutgoingPaymentRequest>("/api/v1/qr-payments/outgoing", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  listOutgoingPayments: async (status?: string, limit: number = 50, offset: number = 0) => {
    let url = `/api/v1/qr-payments/outgoing?limit=${limit}&offset=${offset}`;
    if (status) {
      url += `&status=${status}`;
    }
    return apiRequest<{
      items: OutgoingPaymentRequest[];
      total: number;
      total_pending_amount: number;
    }>(url);
  },

  confirmOutgoingPayment: async (
    id: string,
    data?: {
      actual_amount?: number;
      category_id?: string;
      wallet_id?: string;
    }
  ) => {
    return apiRequest<OutgoingPaymentRequest>(`/api/v1/qr-payments/outgoing/${id}/confirm`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    });
  },

  confirmAllOutgoingPayments: async () => {
    return apiRequest<OutgoingPaymentRequest[]>("/api/v1/qr-payments/outgoing/confirm-all", {
      method: "POST",
    });
  },

  cancelOutgoingPayment: async (id: string) => {
    return apiRequest<OutgoingPaymentRequest>(`/api/v1/qr-payments/outgoing/${id}/cancel`, {
      method: "POST",
    });
  },
};

