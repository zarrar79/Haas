import { callAppApi } from "@/lib/client-api";
import {
  asList,
  haasApiPath,
  unwrapHaasResult,
  type HaasForwardPayload,
} from "@/lib/haas-api";
import type { ApiResult } from "@/types";
import type { ChallengeSummary } from "@/features/challenges/challenge-api";

export async function listChallengeAdmin(
  hackathonId: string,
  filters?: {
    search?: string;
    category?: string;
    difficulty?: string;
    type?: string;
    is_dynamic?: string;
    has_vm?: string;
    mode?: string;
  },
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/challenge-admin`, {
      ...filters,
      limit: "100",
    }),
  );
  return asList<ChallengeSummary>(unwrapHaasResult(result).data);
}

export async function createChallengeAdmin(
  hackathonId: string,
  body: {
    name: string;
    description?: string;
    category?: string | null;
    difficulty_level?: string | null;
    challenge_type?: string | null;
    is_dynamic?: boolean;
    challenge_for?: string;
  },
) {
  const result = await callAppApi<
    ApiResult<HaasForwardPayload<ChallengeSummary>>
  >(haasApiPath(`hackathons/${hackathonId}/challenge-admin`), {
    method: "POST",
    body: { challenge_for: "hackathon", is_active: true, ...body },
  });
  return unwrapHaasResult(result).data;
}

export async function listEventCategories(hackathonId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/categories`, { limit: "100" }),
  );
  return asList<{
    id: string;
    name?: string;
    status?: string;
    category?: string;
  }>(unwrapHaasResult(result).data);
}

export async function createEventCategory(
  hackathonId: string,
  body: { name?: string; description?: string; category?: string },
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/categories`),
    { method: "POST", body },
  );
  return unwrapHaasResult(result).data;
}

export async function approveEventCategory(
  hackathonId: string,
  approvalId: string,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/categories/${approvalId}/approve`),
    { method: "POST", body: {} },
  );
  return unwrapHaasResult(result);
}

export async function addPlayingChallenges(
  hackathonId: string,
  challengeIds: string[],
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/playing/challenges`),
    { method: "POST", body: { challenge_ids: challengeIds } },
  );
  return unwrapHaasResult(result);
}

export async function removePlayingChallenge(
  hackathonId: string,
  challengeId: string,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/playing/challenges/${challengeId}`),
    { method: "DELETE" },
  );
  return unwrapHaasResult(result);
}

export async function addPlayingTeams(hackathonId: string, teamIds: string[]) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/playing/teams`),
    { method: "POST", body: { team_ids: teamIds } },
  );
  return unwrapHaasResult(result);
}

export async function removePlayingTeam(hackathonId: string, teamId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/playing/teams/${teamId}`),
    { method: "DELETE" },
  );
  return unwrapHaasResult(result);
}
