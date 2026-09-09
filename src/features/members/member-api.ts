import { callAppApi } from "@/lib/client-api";
import {
  asList,
  haasApiPath,
  unwrapHaasResult,
  type HaasForwardPayload,
} from "@/lib/haas-api";
import type { ApiResult } from "@/types";

export type MemberUserDetail = {
  id?: string;
  username?: string;
  email?: string;
  name?: string;
  last_name?: string;
  user_type?: string;
  is_block?: boolean;
};

export type EventMember = {
  id: string;
  user: string;
  user_detail?: MemberUserDetail;
  is_active?: boolean;
  is_blocked?: boolean;
  blocked_at?: string | null;
  blocked_reason?: string;
  removed_at?: string | null;
  player_label?: string;
  created_at?: string;
};

export async function listMembers(
  hackathonId: string,
  filters?: {
    search?: string;
    is_blocked?: string;
    show_deleted?: string;
  },
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/members`, {
      ...filters,
      limit: "100",
    }),
  );
  return asList<EventMember>(unwrapHaasResult(result).data);
}

export async function addMember(
  hackathonId: string,
  body: { user: string; player_label?: string },
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<EventMember>>>(
    haasApiPath(`hackathons/${hackathonId}/members`),
    { method: "POST", body },
  );
  return unwrapHaasResult(result).data;
}

export async function createEventUser(
  hackathonId: string,
  body: {
    email: string;
    username: string;
    password: string;
    name?: string;
    last_name?: string;
    phone_number?: string;
    gender?: string;
    player_label?: string;
    team_id?: string;
  },
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/members/create-user`),
    { method: "POST", body },
  );
  return unwrapHaasResult(result).data;
}

export async function updateMember(
  hackathonId: string,
  membershipId: string,
  body: { player_label?: string; is_active?: boolean },
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<EventMember>>>(
    haasApiPath(`hackathons/${hackathonId}/members/${membershipId}`),
    { method: "PATCH", body },
  );
  return unwrapHaasResult(result).data;
}

export async function removeMember(hackathonId: string, membershipId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/members/${membershipId}`),
    { method: "DELETE" },
  );
  return unwrapHaasResult(result);
}

export async function blockMember(
  hackathonId: string,
  membershipId: string,
  reason: string,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/members/${membershipId}/block`),
    { method: "POST", body: { reason } },
  );
  return unwrapHaasResult(result);
}

export async function unblockMember(
  hackathonId: string,
  membershipId: string,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/members/${membershipId}/unblock`),
    { method: "POST", body: {} },
  );
  return unwrapHaasResult(result);
}
