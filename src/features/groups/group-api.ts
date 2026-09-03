import { callAppApi } from "@/lib/client-api";
import {
  asList,
  haasApiPath,
  unwrapHaasResult,
  type HaasForwardPayload,
} from "@/lib/haas-api";
import type { ApiResult } from "@/types";

export type HaasPermission = {
  id: number;
  codename?: string;
  name?: string;
};

export type HaasGroup = {
  id: string | number;
  name: string;
  description?: string;
  hackathon?: string | null;
  can_manage_groups?: boolean;
  user_count?: number;
  permissions?: HaasPermission[];
  users?: Array<{ id: string; username?: string }>;
};

export async function listPermissions() {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath("permissions", { limit: "200" }),
  );
  return asList<HaasPermission>(unwrapHaasResult(result).data);
}

export async function listPlatformGroups() {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath("groups", { limit: "100" }),
  );
  return asList<HaasGroup>(unwrapHaasResult(result).data);
}

export async function listEventGroups(hackathonId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/groups`, { limit: "100" }),
  );
  return asList<HaasGroup>(unwrapHaasResult(result).data);
}

export async function createEventGroup(
  hackathonId: string,
  body: {
    name: string;
    description?: string;
    can_manage_groups?: boolean;
    permission_ids?: number[];
    user_ids?: string[];
  },
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<HaasGroup>>>(
    haasApiPath(`hackathons/${hackathonId}/groups`),
    {
      method: "POST",
      body: { ...body, hackathon: hackathonId },
    },
  );
  return unwrapHaasResult(result).data;
}

export async function createPlatformGroup(body: {
  name: string;
  description?: string;
  permission_ids?: number[];
}) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<HaasGroup>>>(
    haasApiPath("groups"),
    { method: "POST", body },
  );
  return unwrapHaasResult(result).data;
}

export async function assignGroupUsers(
  groupId: string | number,
  body: { user_ids: string[]; remove?: boolean },
  hackathonId?: string,
) {
  const path = hackathonId
    ? `hackathons/${hackathonId}/groups/${groupId}/assign-users`
    : `groups/${groupId}/assign-users`;
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(path),
    { method: "POST", body },
  );
  return unwrapHaasResult(result);
}
