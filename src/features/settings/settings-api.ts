import { callAppApi } from "@/lib/client-api";
import {
  haasApiPath,
  unwrapHaasResult,
  type HaasForwardPayload,
} from "@/lib/haas-api";
import type { ApiResult } from "@/types";

export type EventSettings = Record<string, unknown>;

export type EventModules = {
  jeopardy_enabled?: boolean;
  koth_enabled?: boolean;
  attack_defence_enabled?: boolean;
  viewer_can_export?: boolean;
};

export type UserRules = {
  max_attempts?: number;
  spawn_limit?: number;
  vpn_allowed?: boolean;
  force_password_policy?: boolean;
};

export type PlayingState = {
  is_open?: boolean;
  is_active?: boolean;
  challenges?: Array<{ id: string; name?: string }>;
  teams?: Array<{ id: string; name?: string }>;
};

export type ScoringConfig = Record<string, unknown>;

export async function getSettings(hackathonId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<EventSettings>>>(
    haasApiPath(`hackathons/${hackathonId}/settings`),
  );
  return unwrapHaasResult(result).data;
}

export async function patchSettings(
  hackathonId: string,
  body: Partial<EventSettings>,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<EventSettings>>>(
    haasApiPath(`hackathons/${hackathonId}/settings`),
    { method: "PATCH", body },
  );
  return unwrapHaasResult(result).data;
}

export async function getModules(hackathonId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<EventModules>>>(
    haasApiPath(`hackathons/${hackathonId}/modules`),
  );
  return unwrapHaasResult(result).data;
}

export async function patchModules(
  hackathonId: string,
  body: Partial<EventModules>,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<EventModules>>>(
    haasApiPath(`hackathons/${hackathonId}/modules`),
    { method: "PATCH", body },
  );
  return unwrapHaasResult(result).data;
}

export async function getUserRules(hackathonId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<UserRules>>>(
    haasApiPath(`hackathons/${hackathonId}/user-rules`),
  );
  return unwrapHaasResult(result).data;
}

export async function patchUserRules(
  hackathonId: string,
  body: Partial<UserRules>,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<UserRules>>>(
    haasApiPath(`hackathons/${hackathonId}/user-rules`),
    { method: "PATCH", body },
  );
  return unwrapHaasResult(result).data;
}

export async function getPlaying(hackathonId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<PlayingState>>>(
    haasApiPath(`hackathons/${hackathonId}/playing`),
  );
  return unwrapHaasResult(result).data;
}

export async function patchPlaying(
  hackathonId: string,
  body: { is_open?: boolean; is_active?: boolean },
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<PlayingState>>>(
    haasApiPath(`hackathons/${hackathonId}/playing`),
    { method: "PATCH", body },
  );
  return unwrapHaasResult(result).data;
}

export async function getScoringConfig(hackathonId: string) {
  const result = await callAppApi<
    ApiResult<HaasForwardPayload<ScoringConfig>>
  >(haasApiPath(`hackathons/${hackathonId}/scoring-config`));
  return unwrapHaasResult(result).data;
}

export async function patchScoringConfig(
  hackathonId: string,
  body: Partial<ScoringConfig>,
) {
  const result = await callAppApi<
    ApiResult<HaasForwardPayload<ScoringConfig>>
  >(haasApiPath(`hackathons/${hackathonId}/scoring-config`), {
    method: "PATCH",
    body,
  });
  return unwrapHaasResult(result).data;
}
