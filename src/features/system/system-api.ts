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
};

export type SystemUser = {
  id: string;
  username?: string;
  email?: string;
  name?: string;
  last_name?: string;
  user_type?: string;
  is_block?: boolean;
  blocked_at?: string | null;
  block_reason?: string;
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
};

export type SystemAdmin = {
  id: string;
  user?: string;
  notes?: string;
  role?: string;
  user_detail?: {
    username?: string;
    email?: string;
    name?: string;
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
}) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath("system/users", { ...filters, limit: "100" }),
  );
  return asList<SystemUser>(unwrapHaasResult(result).data);
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

export async function listSystemAdmins() {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath("system/admins", { limit: "100" }),
  );
  return asList<SystemAdmin>(unwrapHaasResult(result).data);
}

export async function grantSystemAdmin(body: {
  user: string;
  notes?: string;
  role?: string;
}) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<SystemAdmin>>>(
    haasApiPath("system/admins"),
    {
      method: "POST",
      body: { role: "system.admin", ...body },
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
}) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath("system/activity", { ...filters, limit: "100" }),
  );
  return asList<Record<string, unknown>>(unwrapHaasResult(result).data);
}
