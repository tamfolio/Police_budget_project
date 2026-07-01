import { apiFetch } from "@/lib/apiClient";
import type { ApiRoleDetail } from "@/lib/rolesApi";

export interface InviteUserInput {
  email: string;
  fullName: string;
  roleId: string;
}

export interface InvitedUser {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  role: ApiRoleDetail;
  invitedBy: string;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

/** POST /auth/invite — accepts an array of invitations. */
export async function inviteUsers(invites: InviteUserInput[]) {
  return apiFetch<InvitedUser[]>(`/auth/invite`, {
    method: "POST",
    body: invites,
  });
}