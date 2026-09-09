import { haasGet, haasList, haasSend } from "@/lib/haas-api";
import type { UserBrief } from "@/types";

export type SystemStats = {
  hackathons?: number;
  hackathons_active?: number;
  playing?: number;
  teams?: number;
  users?: number;
  active_machines?: number;
  role_bindings?: number;
  hackathon_admins?: number;
};

export type SystemUser = {
  id: string;
  username?: string;
  email?: string;
  name?: string;
  last_name?: string;
  full_name?: string;
  user_type?: string;
  organization_name?: string | null;
  organization_info?: string | null;
  media?: string | null;
  media_url?: string | null;
  is_block?: boolean;
  blocked_at?: string | null;
  block_reason?: string;
  is_active?: boolean;
  is_staff?: boolean;
  is_verified?: boolean;
  created_at?: string;
  created_by?: string | null;
  created_by_detail?: (UserBrief & {
    user_type?: string;
    is_staff?: boolean;
    is_superuser?: boolean;
    is_platform_admin?: boolean;
  }) | null;
  updated_by_detail?: (UserBrief & {
    user_type?: string;
    is_staff?: boolean;
    is_superuser?: boolean;
    is_platform_admin?: boolean;
  }) | null;
};

export type SystemUserCreateInput = {
  username: string;
  email: string;
  password: string;
  name?: string;
  last_name?: string;
  user_type?: string;
  is_verified?: boolean;
  email_verified?: boolean;
};

/** Hackathon main-admin binding (platform operators assign per event). */
export type SystemAdmin = {
  id: string;
  user?: string;
  hackathon?: string;
  hackathon_name?: string;
  notes?: string;
  is_active?: boolean;
  granted_at?: string;
  user_detail?: UserBrief;
};

export function getSystemStats() {
  return haasGet<SystemStats>("system/stats");
}

export function listSystemUsers(filters?: {
  search?: string;
  is_block?: string;
  /** Users created or updated by staff / Root. */
  has_created_by?: string;
  staff_provisioned?: string;
}) {
  return haasList<SystemUser>("system/users", {
    ...filters,
    // Prefer explicit staff_provisioned; keep has_created_by for older callers.
    staff_provisioned:
      filters?.staff_provisioned ?? filters?.has_created_by ?? undefined,
    limit: "100",
  });
}

export function createSystemUser(body: SystemUserCreateInput) {
  return haasSend<SystemUser>("system/users", { method: "POST", body });
}

export function blockSystemUser(userId: string, reason: string) {
  return haasSend<unknown>(`system/users/${userId}/block`, {
    method: "POST",
    body: { reason },
  });
}

export function unblockSystemUser(userId: string) {
  return haasSend<unknown>(`system/users/${userId}/unblock`, {
    method: "POST",
    body: {},
  });
}

export function listSystemAdmins(filters?: {
  hackathon?: string;
  user?: string;
}) {
  return haasList<SystemAdmin>("system/admins", { ...filters, limit: "100" });
}

export function grantSystemAdmin(body: {
  user: string;
  hackathon: string;
  notes?: string;
}) {
  return haasSend<SystemAdmin>("system/admins", { method: "POST", body });
}

export function revokeSystemAdmin(bindingId: string) {
  return haasSend<unknown>(`system/admins/${bindingId}`, { method: "DELETE" });
}

export function listSystemAudit(filters?: {
  hackathon?: string;
  action?: string;
  category?: string;
}) {
  return haasList<Record<string, unknown>>("system/audit", {
    ...filters,
    limit: "100",
  });
}

export function listSystemActivity(filters?: {
  type?: string;
  user?: string;
  hackathon?: string;
  search?: string;
  ip?: string;
  ip_address?: string;
  date_after?: string;
  date_before?: string;
  ordering?: string;
}) {
  return haasList<Record<string, unknown>>("system/activity", {
    ...filters,
    limit: "100",
  });
}
