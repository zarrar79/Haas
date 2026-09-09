import { asList, haasGet, haasList, haasSend } from "@/lib/haas-api";

export type KothSessionStatus = "idle" | "running" | "paused" | "stopped";

export type KothSession = {
  id: string;
  hackathon: string;
  hackathon_name?: string;
  name: string;
  status: KothSessionStatus;
  initial_score: number;
  hold_interval_seconds: number;
  hold_score: number;
  current_team: string | null;
  current_team_name?: string | null;
  current_team_code?: string | null;
  current_hold?: string | null;
  current_hold_started_at?: string | null;
  last_hold_award_at?: string | null;
  ingest_token?: string;
  ingest_token_set?: boolean;
  scorer_pod_url: string;
  scorer_pod_token?: string;
  scorer_pod_token_set?: boolean;
  started_at?: string | null;
  paused_at?: string | null;
  stopped_at?: string | null;
  is_active: boolean;
  accepts_codes?: boolean;
  team_score_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type KothTeamScore = {
  id: string;
  team: string;
  team_name: string;
  team_code: string;
  total_score: number;
  times_became_king: number;
  times_dethroned: number;
  total_hold_seconds: number;
  updated_at?: string;
};

export type KothHold = {
  id: string;
  team: string;
  team_name: string;
  team_code: string;
  started_at: string;
  ended_at: string | null;
  end_reason: string;
  initial_points: number;
  hold_ticks: number;
  hold_points: number;
  hold_seconds: number;
  is_active: boolean;
};

export type KothLeaderboardPayload = {
  session: KothSession;
  leaderboard: KothTeamScore[];
};

export type KothSessionConfigPatch = {
  name?: string;
  initial_score?: number;
  hold_interval_seconds?: number;
  hold_score?: number;
  scorer_pod_url?: string;
  scorer_pod_token?: string;
  ingest_token?: string;
  rotate_ingest_token?: boolean;
};

export type KothSessionCreateBody = {
  name?: string;
  initial_score?: number;
  hold_interval_seconds?: number;
  hold_score?: number;
  scorer_pod_url?: string;
  scorer_pod_token?: string;
};

function base(hackathonId: string) {
  return `hackathons/${hackathonId}/koth`;
}

function sessionBase(hackathonId: string, sessionId: string) {
  return `${base(hackathonId)}/${sessionId}`;
}

export async function listKothSessions(hackathonId: string) {
  return haasList<KothSession>(base(hackathonId));
}

export async function createKothSession(
  hackathonId: string,
  body: KothSessionCreateBody = {},
) {
  return haasSend<KothSession>(base(hackathonId), {
    method: "POST",
    body,
  });
}

export async function getKothSession(hackathonId: string, sessionId: string) {
  return haasGet<KothSession>(sessionBase(hackathonId, sessionId));
}

export async function updateKothSession(
  hackathonId: string,
  sessionId: string,
  body: KothSessionConfigPatch,
) {
  return haasSend<KothSession>(sessionBase(hackathonId, sessionId), {
    method: "PATCH",
    body,
  });
}

/** Soft-delete: stops if running, removes from active list. */
export async function deleteKothSession(hackathonId: string, sessionId: string) {
  return haasSend<KothSession>(sessionBase(hackathonId, sessionId), {
    method: "DELETE",
  });
}

/** @deprecated Prefer deleteKothSession */
export const archiveKothSession = deleteKothSession;

export async function startKoth(hackathonId: string, sessionId: string) {
  return haasSend<KothSession>(`${sessionBase(hackathonId, sessionId)}/start`, {
    method: "POST",
  });
}

export async function pauseKoth(hackathonId: string, sessionId: string) {
  return haasSend<KothSession>(`${sessionBase(hackathonId, sessionId)}/pause`, {
    method: "POST",
  });
}

export async function resumeKoth(hackathonId: string, sessionId: string) {
  return haasSend<KothSession>(`${sessionBase(hackathonId, sessionId)}/resume`, {
    method: "POST",
  });
}

export async function stopKoth(hackathonId: string, sessionId: string) {
  return haasSend<KothSession>(`${sessionBase(hackathonId, sessionId)}/stop`, {
    method: "POST",
  });
}

export async function resetKothScores(hackathonId: string, sessionId: string) {
  return haasSend<KothSession>(
    `${sessionBase(hackathonId, sessionId)}/reset-scores`,
    { method: "POST" },
  );
}

export async function getKothLeaderboard(hackathonId: string, sessionId: string) {
  return haasGet<KothLeaderboardPayload>(
    `${sessionBase(hackathonId, sessionId)}/leaderboard`,
  );
}

export async function listKothHolds(hackathonId: string, sessionId: string) {
  const data = await haasGet<KothHold[] | { results: KothHold[] }>(
    `${sessionBase(hackathonId, sessionId)}/holds`,
  );
  return asList<KothHold>(data);
}

export async function resetKothVm(hackathonId: string, sessionId: string) {
  return haasSend<unknown>(`${sessionBase(hackathonId, sessionId)}/reset-vm`, {
    method: "POST",
  });
}

export async function resetKothFlag(hackathonId: string, sessionId: string) {
  return haasSend<unknown>(`${sessionBase(hackathonId, sessionId)}/reset-flag`, {
    method: "POST",
  });
}
