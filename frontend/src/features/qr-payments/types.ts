export interface SupportedBank {
  code: string;
  name: string;
  bin: string;
  short_name: string;
}

export interface ReceivingAccount {
  id: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  masked_account_number: string;
  account_holder_name: string;
  display_name: string | null;
  linked_wallet_id: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentReconciliation {
  id: string;
  payment_request_id: string;
  expected_amount: number;
  actual_amount: number;
  difference_amount: number;
  difference_type: "SHORTFALL" | "OVERPAYMENT" | "MATCHED";
  status: "OPEN" | "REVIEWED" | "RESOLVED" | "IGNORED";
  notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncomingPaymentRequest {
  id: string;
  reference_code: string;
  expected_amount: number;
  actual_amount: number | null;
  receiving_account_id: string | null;
  target_wallet_id: string;
  category_id: string | null;
  description: string | null;
  transfer_memo: string;
  qr_payload: string;
  status: "PENDING" | "USER_CONFIRMED" | "CANCELLED" | "EXPIRED";
  bank_code_snapshot: string;
  bank_name_snapshot: string;
  account_number_snapshot: string;
  masked_account_number_snapshot: string;
  account_holder_snapshot: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  reconciliation?: PaymentReconciliation | null;
}

export interface OutgoingPaymentRequest {
  id: string;
  owner_user_id: string;
  wallet_id: string;
  category_id: string | null;
  amount: number;
  description: string | null;
  bank_code: string | null;
  bank_name: string | null;
  account_number: string | null;
  account_holder_name: string | null;
  qr_payload: string | null;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  wallet_transaction_id: string | null;
  created_at: string;
  confirmed_at: string | null;
  wallet_name?: string | null;
  category_name?: string | null;
}

