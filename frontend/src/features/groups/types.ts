export type GroupRole = "OWNER" | "ADMIN" | "MEMBER";

export interface GroupItem {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  created_by_user_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  current_user_role: GroupRole | null;
  member_count: number;
}

export interface GroupMemberItem {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupRole;
  status?: string;
  is_active?: boolean;
  joined_at: string;
  user_email?: string | null;
  user_full_name?: string | null;
  display_name?: string | null;
  email?: string | null;
}

export interface GroupDetail extends GroupItem {
  group: GroupItem;
  members: GroupMemberItem[];
}

export interface CreateGroupPayload {
  name: string;
  description?: string;
  currency?: string;
}

export interface CreateInvitationPayload {
  role?: GroupRole;
  expires_in_days?: number;
}

export interface InvitationResult {
  id: string;
  group_id: string;
  raw_token: string;
  invite_token?: string;
  expires_at: string;
  created_at?: string;
}

// ==========================================
// Phase 5: Group Finance Types
// ==========================================

export interface GroupExpenseSplit {
  id: string;
  member_user_id: string;
  member_name?: string | null;
  member_email?: string | null;
  amount_owed: number;
}

export interface GroupExpense {
  id: string;
  group_id: string;
  title: string;
  total_amount: number;
  expense_date: string;
  payment_source: "MEMBER" | "FUND";
  paid_by_user_id?: string | null;
  paid_by_name?: string | null;
  fund_id?: string | null;
  split_method: "EQUAL" | "CUSTOM";
  status: "POSTED" | "VOID";
  created_by_user_id: string;
  void_reason?: string | null;
  created_at: string;
  splits: GroupExpenseSplit[];
}

export interface CreateGroupExpensePayload {
  title: string;
  total_amount: number;
  expense_date?: string;
  payment_source: "MEMBER" | "FUND";
  paid_by_user_id?: string | null;
  split_method: "EQUAL" | "CUSTOM";
  splits: {
    member_user_id: string;
    amount?: number;
  }[];
}

export interface GroupFund {
  id: string;
  group_id: string;
  name: string;
  description?: string | null;
  status: string;
  balance: number;
  created_at: string;
}

export interface GroupFundTransaction {
  id: string;
  fund_id: string;
  transaction_type: "CONTRIBUTION" | "EXPENSE" | "WITHDRAWAL" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";
  amount: number;
  contributed_by_user_id?: string | null;
  contributor_name?: string | null;
  created_by_user_id: string;
  group_expense_id?: string | null;
  description?: string | null;
  transaction_date: string;
  created_at: string;
}

export interface MemberBalanceSummary {
  user_id: string;
  full_name?: string | null;
  email: string;
  total_paid: number;
  total_share: number;
  settlement_paid: number;
  settlement_received: number;
  net_balance: number;
}

export interface DebtSimplificationItem {
  from_user_id: string;
  from_user_name: string;
  to_user_id: string;
  to_user_name: string;
  amount: number;
}

export interface GroupDebtOverview {
  group_id: string;
  currency: string;
  members_balances: MemberBalanceSummary[];
  suggested_settlements: DebtSimplificationItem[];
  current_user_net: number;
}

export interface GroupSettlement {
  id: string;
  group_id: string;
  from_user_id: string;
  from_user_name?: string | null;
  to_user_id: string;
  to_user_name?: string | null;
  amount: number;
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";
  note?: string | null;
  created_at: string;
  confirmed_at?: string | null;
  rejected_at?: string | null;
  cancelled_at?: string | null;
}
