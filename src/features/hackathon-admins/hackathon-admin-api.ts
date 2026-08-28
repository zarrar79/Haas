import { callAppApi } from "@/lib/client-api";
import {
  asList,
  haasApiPath,
  unwrapHaasResult,
  type HaasForwardPayload,
} from "@/lib/haas-api";
import type { ApiResult } from "@/types";

export type HackathonAdminBinding = {
  id: string;
  user: string;
  hackathon: string;
  is_active?: boolean;
  granted_at?: string;
  revoked_at?: string | null;
  notes?: string;
  user_detail?: {
    id?: string;
    username?: string;
    email?: string;
    name?: string;
    last_name?: string;
  };
  hackathon_detail?: {
    id?: string;
    name?: string;
  };
};

export async function listHackathonAdmins(filters?: {
  hackathon?: string;
  user?: string;
  is_active?: string;
}) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath("hackathon-admins", {
      ...filters,
      limit: "100",
    }),
  );
  return asList<HackathonAdminBinding>(unwrapHaasResult(result).data);
}

export async function assignHackathonAdmin(body: {
  user: string;
  hackathon: string;
  notes?: string;
}) {
  const result = await callAppApi<
    ApiResult<HaasForwardPayload<HackathonAdminBinding>>
  >(haasApiPath("hackathon-admins"), { method: "POST", body });
  return unwrapHaasResult(result).data;
}

export async function revokeHackathonAdmin(bindingId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathon-admins/${bindingId}`),
    { method: "DELETE" },
  );
  return unwrapHaasResult(result);
}
