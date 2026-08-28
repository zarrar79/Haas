import { callAppApi } from "@/lib/client-api";
import {
  asList,
  haasApiPath,
  unwrapHaasResult,
  type HaasForwardPayload,
} from "@/lib/haas-api";
import type { ApiResult } from "@/types";

export type RoleBinding = {
  id: string;
  user: string;
  role: string;
  is_active?: boolean;
  expires_at?: string | null;
  user_detail?: {
    username?: string;
    email?: string;
    name?: string;
  };
};

export async function listRoles(hackathonId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/roles`, { limit: "100" }),
  );
  return asList<RoleBinding>(unwrapHaasResult(result).data);
}

export async function grantRole(
  hackathonId: string,
  body: { user: string; role: string; expires_at?: string | null },
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<RoleBinding>>>(
    haasApiPath(`hackathons/${hackathonId}/roles`),
    { method: "POST", body },
  );
  return unwrapHaasResult(result).data;
}

export async function updateRole(
  hackathonId: string,
  bindingId: string,
  body: { is_active?: boolean; expires_at?: string | null; role?: string },
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<RoleBinding>>>(
    haasApiPath(`hackathons/${hackathonId}/roles/${bindingId}`),
    { method: "PATCH", body },
  );
  return unwrapHaasResult(result).data;
}

export async function revokeRole(hackathonId: string, bindingId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/roles/${bindingId}`),
    { method: "DELETE" },
  );
  return unwrapHaasResult(result);
}
