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
  is_active: boolean;
  joined_at: string;
  user_email?: string | null;
  user_full_name?: string | null;
}

export interface GroupDetail {
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
  expires_in_hours?: number;
}

export interface InvitationResult {
  invitation_id: string;
  group_id: string;
  invite_token: string;
  expires_at: string;
  message: string;
}

