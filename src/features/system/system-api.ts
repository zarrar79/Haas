import { callAppApi } from "@/lib/client-api";
import {
  asList,
  haasApiPath,
  unwrapHaasResult,
  type HaasForwardPayload,
} from "@/lib/haas-api";
import type { ApiResult } from "@/types";

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
  created_by_detail?: {
    id?: string;
    username?: string;
    email?: string;
    name?: string;
    last_name?: string;
    user_type?: string;
    is_staff?: boolean;
    is_superuser?: boolean;
    is_platform_admin?: boolean;
  } | null;
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
  user_detail?: {
    id?: string;
    username?: string;
    email?: string;
    name?: string;
    last_name?: string;
  };
};

export async function getSystemStats() {
  const result = await callAppApi<ApiResult<HaasForwardPayload<SystemStats>>>(
    haasApiPath("system/stats"),
  );
  return unwrapHaasResult(result).data;
}

export async function listSystemUsers(filters?: {
  search?: string;
  is_block?: string;
  /** When true, only users with created_by set (staff-provisioned). */
  has_created_by?: string;
}) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath("system/users", { ...filters, limit: "100" }),
  );
  return asList<SystemUser>(unwrapHaasResult(result).data);
}

export async function createSystemUser(body: SystemUserCreateInput) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<SystemUser>>>(
    haasApiPath("system/users"),
    { method: "POST", body },
  );
  return unwrapHaasResult(result).data;
}

export async function blockSystemUser(userId: string, reason: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`system/users/${userId}/block`),
    { method: "POST", body: { reason } },
  );
  return unwrapHaasResult(result);
}

export async function unblockSystemUser(userId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`system/users/${userId}/unblock`),
    { method: "POST", body: {} },
  );
  return unwrapHaasResult(result);
}

export async function listSystemAdmins(filters?: {
  hackathon?: string;
  user?: string;
}) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath("system/admins", { ...filters, limit: "100" }),
  );
  return asList<SystemAdmin>(unwrapHaasResult(result).data);
}

export async function grantSystemAdmin(body: {
  user: string;
  hackathon: string;
  notes?: string;
}) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<SystemAdmin>>>(
    haasApiPath("system/admins"),
    {
      method: "POST",
      body,
    },
  );
  return unwrapHaasResult(result).data;
}

export async function revokeSystemAdmin(bindingId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`system/admins/${bindingId}`),
    { method: "DELETE" },
  );
  return unwrapHaasResult(result);
}

export async function listSystemAudit(filters?: {
  hackathon?: string;
  action?: string;
  category?: string;
}) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath("system/audit", { ...filters, limit: "100" }),
  );
  return asList<Record<string, unknown>>(unwrapHaasResult(result).data);
}

export async function listSystemActivity(filters?: {
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
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath("system/activity", { ...filters, limit: "100" }),
  );
  return asList<Record<string, unknown>>(unwrapHaasResult(result).data);
}
