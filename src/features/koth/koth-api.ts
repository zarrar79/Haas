import { asList, haasGet, haasList, haasSend, toFormData } from "@/lib/haas-api";

export type KothSessionStatus = "idle" | "running" | "paused" | "stopped";
export type KothDeployMode = "existing_vm" | "yaml_deploy";
export type KothDeployStatus =
  | "idle"
  | "spawning"
  | "running"
  | "stopping"
  | "error";

export type KothSession = {
  id: string;
  hackathon: string;
  hackathon_name?: string;
  name: string;
  player_title?: string;
  player_description?: string;
  display_title?: string;
  /** Admin switch: when false, player boards lock their sound button off. */
  sound_enabled?: boolean;
  vm_ip?: string;
  status: KothSessionStatus;
  /** One-time points the first time a team is king in the hackathon. */
  initial_score: number;
  /** Points every time a team becomes king. */
  king_score?: number;
  /** Bonus for the hackathon's very first king. */
  first_blood_score?: number;
  hold_interval_seconds: number;
  hold_score: number;
  current_team: string | null;
  current_team_name?: string | null;
  current_koth_code?: string | null;
  current_hold?: string | null;
  current_hold_started_at?: string | null;
  last_hold_award_at?: string | null;
  ingest_token?: string;
  ingest_token_set?: boolean;
  scorer_agent_token?: string;
  scorer_agent_token_set?: boolean;
  deploy_mode?: KothDeployMode;
  deploy_team?: string | null;
  deploy_team_name?: string | null;
  deploy_team_name_code?: string | null;
  deploy_team_pool_ip?: string | null;
  deploy_namespace?: string;
  deploy_yaml_set?: boolean;
  deploy_status?: KothDeployStatus;
  deploy_error?: string;
  scorer_pod_url: string;
  scorer_pod_token?: string;
  scorer_pod_token_set?: boolean;
  started_at?: string | null;
  paused_at?: string | null;
  stopped_at?: string | null;
  /** Planned round start; null = hackathon start. */
  start_time?: string | null;
  /** Planned round end; null = hackathon end. */
  end_time?: string | null;
  /** Effective window (start_time / end_time, else the hackathon's). */
  schedule_start?: string | null;
  schedule_end?: string | null;
  is_active: boolean;
  accepts_codes?: boolean;
  team_score_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type KothDeployStatusPayload = {
  deploy_mode: KothDeployMode | string;
  deploy_status: KothDeployStatus | string;
  deploy_error: string;
  deploy_namespace: string;
  deploy_yaml_set: boolean;
  vm_ip: string;
  team_id: string | null;
  team_name: string | null;
  team_name_code: string | null;
  team_pool_ip: string | null;
  session?: KothSession;
};

export type KothTeamScore = {
  id: string;
  team: string;
  team_name: string;
  koth_code: string;
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
  koth_code: string;
  started_at: string;
  ended_at: string | null;
  end_reason: string;
  initial_points: number;
  king_points?: number;
  first_blood_points?: number;
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
  player_title?: string;
  player_description?: string;
  sound_enabled?: boolean;
  vm_ip?: string;
  initial_score?: number;
  king_score?: number;
  first_blood_score?: number;
  hold_interval_seconds?: number;
  hold_score?: number;
  /** Planned round start (ISO); null clears it (falls back to hackathon start). */
  start_time?: string | null;
  /** Planned round end (ISO); null clears it (falls back to hackathon end). */
  end_time?: string | null;
  scorer_pod_url?: string;
  scorer_pod_token?: string;
  ingest_token?: string;
  rotate_ingest_token?: boolean;
  scorer_agent_token?: string;
  rotate_scorer_agent_token?: boolean;
  deploy_mode?: KothDeployMode;
  sync_scorer?: boolean;
};

export type KothSessionCreateBody = {
  name?: string;
  player_title?: string;
  player_description?: string;
  sound_enabled?: boolean;
  vm_ip?: string;
  initial_score?: number;
  king_score?: number;
  first_blood_score?: number;
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

export async function syncKothScorer(hackathonId: string, sessionId: string) {
  return haasSend<{ session: KothSession; scorer: unknown }>(
    `${sessionBase(hackathonId, sessionId)}/sync-scorer`,
    { method: "POST" },
  );
}

export async function getKothDeployStatus(
  hackathonId: string,
  sessionId: string,
) {
  return haasGet<KothDeployStatusPayload>(
    `${sessionBase(hackathonId, sessionId)}/deploy/status`,
  );
}

export async function uploadKothDeployYaml(
  hackathonId: string,
  sessionId: string,
  file: File,
) {
  return haasSend<KothDeployStatusPayload>(
    `${sessionBase(hackathonId, sessionId)}/deploy/upload-yaml`,
    {
      method: "POST",
      body: toFormData({}, { file, fileField: "yaml" }),
    },
  );
}

export async function spawnKothDeploy(
  hackathonId: string,
  sessionId: string,
  body: { team_id: string; rotate_agent_token?: boolean },
) {
  return haasSend<KothDeployStatusPayload>(
    `${sessionBase(hackathonId, sessionId)}/deploy/spawn`,
    { method: "POST", body },
  );
}

export async function stopKothDeploy(hackathonId: string, sessionId: string) {
  return haasSend<KothDeployStatusPayload>(
    `${sessionBase(hackathonId, sessionId)}/deploy/stop`,
    { method: "POST" },
  );
}

export async function respawnKothDeploy(
  hackathonId: string,
  sessionId: string,
  body: { rotate_agent_token?: boolean } = {},
) {
  return haasSend<KothDeployStatusPayload>(
    `${sessionBase(hackathonId, sessionId)}/deploy/respawn`,
    { method: "POST", body },
  );
}
