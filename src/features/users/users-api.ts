import { callAppApi } from "@/lib/client-api";
import {
  asList,
  haasApiPath,
  unwrapHaasResult,
  type HaasForwardPayload,
} from "@/lib/haas-api";
import type { ApiResult } from "@/types";

export type EventUserTeam = {
  membership_id?: string;
  id: string;
  name?: string;
  team_code?: string;
  is_captain?: boolean;
  is_approved?: boolean;
  is_default?: boolean;
  joined_at?: string;
  approved_at?: string | null;
};

export type EventUser = {
  id: string;
  username?: string;
  email?: string;
  name?: string;
  last_name?: string;
  full_name?: string;
  phone_number?: string;
  phone_number_confirmed?: boolean;
  gender?: string;
  cnic?: string;
  user_type?: string;
  skill_type?: string;
  education?: unknown;
  certifications?: unknown;
  expertise?: unknown;
  team_type?: unknown;
  organization_info?: string | null;
  organization_name?: string | null;
  media?: string | null;
  media_url?: string | null;
  is_block?: boolean;
  blocked_at?: string | null;
  block_reason?: string;
  is_active?: boolean;
  is_verified?: boolean;
  email_verified?: boolean;
  email_confirmed?: boolean;
  two_factor_enabled?: boolean;
  lockout_enabled?: boolean;
  lockout_end?: string | null;
  access_failed_count?: number;
  is_lms_user?: boolean;
  created_in?: string | null;
  created_in_hackathon?: {
    id?: string;
    name?: string;
    display_name?: string;
    playing_hackathon_id?: string | null;
  } | null;
  playing_hackathon?: string | null;
  created_at?: string;
  updated_at?: string;
  teams?: EventUserTeam[];
  team_count?: number;
};

export type EventUserCreateInput = {
  email: string;
  username: string;
  password: string;
  name?: string;
  last_name?: string;
  phone_number?: string;
  gender?: string;
  education?: unknown;
  certifications?: { name: string }[];
  expertise?: {
    category?: string;
    level?: string;
    techStack?: string[];
  }[];
  team_type?: Record<string, unknown>;
  team_id?: string;
  is_block?: boolean;
};

export type EventUserUpdateInput = {
  username?: string;
  name?: string;
  last_name?: string;
  phone_number?: string;
  gender?: string;
  password?: string;
  education?: unknown;
  certifications?: { name: string }[];
  expertise?: {
    category?: string;
    level?: string;
    techStack?: string[];
  }[];
  team_type?: Record<string, unknown>;
  is_block?: boolean;
};

export async function listEventUsers(
  hackathonId: string,
  filters?: {
    search?: string;
    is_block?: string;
    is_active?: string;
    user_type?: string;
    team?: string;
    limit?: string;
  },
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/users`, {
      ...filters,
      limit: filters?.limit ?? "100",
    }),
  );
  return asList<EventUser>(unwrapHaasResult(result).data);
}

export async function getEventUser(hackathonId: string, userId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<EventUser>>>(
    haasApiPath(`hackathons/${hackathonId}/users/${userId}`),
  );
  return unwrapHaasResult(result).data;
}

export async function createEventUser(
  hackathonId: string,
  body: EventUserCreateInput,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<EventUser>>>(
    haasApiPath(`hackathons/${hackathonId}/users`),
    { method: "POST", body },
  );
  return unwrapHaasResult(result).data;
}

export async function updateEventUser(
  hackathonId: string,
  userId: string,
  body: EventUserUpdateInput,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<EventUser>>>(
    haasApiPath(`hackathons/${hackathonId}/users/${userId}`),
    { method: "PATCH", body },
  );
  return unwrapHaasResult(result).data;
}

export async function deleteEventUser(hackathonId: string, userId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/users/${userId}`),
    { method: "DELETE" },
  );
  return unwrapHaasResult(result);
}

export async function blockEventUser(
  hackathonId: string,
  userId: string,
  reason: string,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<EventUser>>>(
    haasApiPath(`hackathons/${hackathonId}/users/${userId}/block`),
    { method: "POST", body: { reason } },
  );
  return unwrapHaasResult(result).data;
}

export async function unblockEventUser(hackathonId: string, userId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<EventUser>>>(
    haasApiPath(`hackathons/${hackathonId}/users/${userId}/unblock`),
    { method: "POST", body: {} },
  );
  return unwrapHaasResult(result).data;
}

export function eventUserLabel(user: EventUser): string {
  const name = user.full_name || [user.name, user.last_name].filter(Boolean).join(" ").trim();
  return name || user.username || user.email || user.id;
}

export function eventUserDetailPath(hackathonId: string, userId: string) {
  return `/events/${hackathonId}/users/${userId}`;
}
