import { apiRequest } from "@/lib/api-client";
import {
  GroupItem,
  GroupDetail,
  GroupMemberItem,
  CreateGroupPayload,
  InvitationResult,
  GroupExpense,
  GroupFund,
  GroupFundTransaction,
  GroupDebtOverview,
  GroupSettlement,
  GroupRole,
} from "./types";

export const groupService = {
  // Groups
  getGroups: async () => {
    return apiRequest<GroupItem[]>("/api/v1/groups");
  },

  getGroupDetail: async (groupId: string) => {
    return apiRequest<GroupDetail>(`/api/v1/groups/${groupId}`);
  },

  createGroup: async (data: CreateGroupPayload) => {
    return apiRequest<GroupItem>("/api/v1/groups", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateGroup: async (
    groupId: string,
    data: { name?: string; description?: string }
  ) => {
    return apiRequest<GroupItem>(`/api/v1/groups/${groupId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  leaveGroup: async (groupId: string) => {
    return apiRequest<void>(`/api/v1/groups/${groupId}/leave`, {
      method: "POST",
    });
  },

  // Invitations & Join
  createInvitation: async (
    groupId: string,
    data: { expires_in_days?: number; invited_email?: string; reusable?: boolean }
  ) => {
    return apiRequest<InvitationResult>(`/api/v1/groups/${groupId}/invitations`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  joinGroup: async (token: string) => {
    return apiRequest<GroupDetail>("/api/v1/groups/join", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },

  // Members Management
  addMemberByEmail: async (
    groupId: string,
    email: string,
    role: GroupRole = "MEMBER"
  ) => {
    return apiRequest<GroupMemberItem>(
      `/api/v1/groups/${groupId}/members/add-by-email`,
      {
        method: "POST",
        body: JSON.stringify({ email, role }),
      }
    );
  },

  updateMemberRole: async (
    groupId: string,
    targetUserId: string,
    role: GroupRole
  ) => {
    return apiRequest<GroupMemberItem>(
      `/api/v1/groups/${groupId}/members/${targetUserId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }
    );
  },

  removeMember: async (groupId: string, targetUserId: string) => {
    return apiRequest<void>(
      `/api/v1/groups/${groupId}/members/${targetUserId}`,
      {
        method: "DELETE",
      }
    );
  },

  // Group Financial Data
  getExpenses: async (groupId: string, params?: URLSearchParams) => {
    const qs = params ? `?${params.toString()}` : "";
    return apiRequest<GroupExpense[]>(`/api/v1/groups/${groupId}/expenses${qs}`);
  },

  getFund: async (groupId: string) => {
    return apiRequest<GroupFund>(`/api/v1/groups/${groupId}/fund`);
  },

  getFundTransactions: async (groupId: string) => {
    return apiRequest<GroupFundTransaction[]>(
      `/api/v1/groups/${groupId}/fund/transactions`
    );
  },

  getDebts: async (groupId: string) => {
    return apiRequest<GroupDebtOverview>(`/api/v1/groups/${groupId}/debts`);
  },

  getSettlements: async (groupId: string) => {
    return apiRequest<GroupSettlement[]>(`/api/v1/groups/${groupId}/settlements`);
  },

  voidExpense: async (groupId: string, expenseId: string, reason: string) => {
    return apiRequest<GroupExpense>(
      `/api/v1/groups/${groupId}/expenses/${expenseId}/void`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      }
    );
  },

  rejectSettlement: async (groupId: string, settlementId: string) => {
    return apiRequest<GroupSettlement>(
      `/api/v1/groups/${groupId}/settlements/${settlementId}/reject`,
      {
        method: "POST",
      }
    );
  },

  createExpense: async (groupId: string, data: any) => {
    return apiRequest<GroupExpense>(`/api/v1/groups/${groupId}/expenses`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  depositFund: async (groupId: string, data: any) => {
    return apiRequest<GroupFundTransaction>(`/api/v1/groups/${groupId}/fund/contributions`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  withdrawFund: async (groupId: string, data: any) => {
    return apiRequest<GroupFundTransaction>(`/api/v1/groups/${groupId}/fund/withdrawals`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  createSettlement: async (groupId: string, data: any) => {
    return apiRequest<GroupSettlement>(`/api/v1/groups/${groupId}/settlements`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  confirmSettlement: async (groupId: string, settlementId: string, data?: any) => {
    return apiRequest<GroupSettlement>(
      `/api/v1/groups/${groupId}/settlements/${settlementId}/confirm`,
      {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
      }
    );
  },

  cancelSettlement: async (groupId: string, settlementId: string) => {
    return apiRequest<GroupSettlement>(
      `/api/v1/groups/${groupId}/settlements/${settlementId}/cancel`,
      {
        method: "POST",
      }
    );
  },
};
