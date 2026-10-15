export interface Wallet {
  id: string;
  owner_user_id: string;
  name: string;
  wallet_type: string;
  currency: string;
  opening_balance: number;
  current_balance: number;
  bank_code?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  account_holder_name?: string | null;
  is_archived: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  owner_user_id: string | null;
  name: string;
  kind: "INCOME" | "EXPENSE";
  icon_key: string | null;
  is_archived: boolean;
  is_system: boolean;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  wallet_name: string;
  transaction_type: string;
  amount: number;
  category_id: string | null;
  category_name: string | null;
  description: string | null;
  transaction_date: string;
  transfer_group_id: string | null;
  source_type?: string | null;
  source_id?: string | null;
  created_at: string;
}

export interface CategoryExpenseBreakdown {
  category_id: string | null;
  category_name: string;
  total_amount: number;
  percentage: number;
}

export interface FinancialSummary {
  total_assets: number;
  total_income: number;
  total_expense: number;
  net_cash_flow: number;
  wallets: Wallet[];
  expense_breakdown: CategoryExpenseBreakdown[];
  income_breakdown?: CategoryExpenseBreakdown[];
}

