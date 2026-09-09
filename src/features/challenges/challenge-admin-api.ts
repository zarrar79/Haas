import { haasList, haasSend } from "@/lib/haas-api";
import type { ChallengeSummary } from "@/features/challenges/challenge-api";

export function listChallengeAdmin(
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
  return haasList<ChallengeSummary>(
    `hackathons/${hackathonId}/challenge-admin`,
    { ...filters, limit: "100" },
  );
}

export function createChallengeAdmin(
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
  return haasSend<ChallengeSummary>(
    `hackathons/${hackathonId}/challenge-admin`,
    {
      method: "POST",
      body: { challenge_for: "hackathon", is_active: true, ...body },
    },
  );
}

export function listEventCategories(hackathonId: string) {
  return haasList<{
    id: string;
    name?: string;
    status?: string;
    category?: string;
  }>(`hackathons/${hackathonId}/categories`, { limit: "100" });
}

export function createEventCategory(
  hackathonId: string,
  body: { name?: string; description?: string; category?: string },
) {
  return haasSend<unknown>(`hackathons/${hackathonId}/categories`, {
    method: "POST",
    body,
  });
}

export function approveEventCategory(hackathonId: string, approvalId: string) {
  return haasSend<unknown>(
    `hackathons/${hackathonId}/categories/${approvalId}/approve`,
    { method: "POST", body: {} },
  );
}

export function addPlayingChallenges(
  hackathonId: string,
  challengeIds: string[],
) {
  return haasSend<unknown>(`hackathons/${hackathonId}/playing/challenges`, {
    method: "POST",
    body: { challenge_ids: challengeIds },
  });
}

export function removePlayingChallenge(
  hackathonId: string,
  challengeId: string,
) {
  return haasSend<unknown>(
    `hackathons/${hackathonId}/playing/challenges/${challengeId}`,
    { method: "DELETE" },
  );
}

export function addPlayingTeams(hackathonId: string, teamIds: string[]) {
  return haasSend<unknown>(`hackathons/${hackathonId}/playing/teams`, {
    method: "POST",
    body: { team_ids: teamIds },
  });
}

export function removePlayingTeam(hackathonId: string, teamId: string) {
  return haasSend<unknown>(
    `hackathons/${hackathonId}/playing/teams/${teamId}`,
    { method: "DELETE" },
  );
}
