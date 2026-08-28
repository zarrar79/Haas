import { callAppApi } from "@/lib/client-api";
import {
  asList,
  haasApiPath,
  unwrapHaasResult,
  type HaasForwardPayload,
} from "@/lib/haas-api";
import type { ApiResult } from "@/types";
import type { HackathonAnalytics } from "@/features/hackathons/hackathon-api";

export type ScoreRow = {
  id: string;
  user?: string;
  user_detail?: {
    id?: string;
    username?: string;
    email?: string;
    name?: string;
    last_name?: string;
  };
  team?: string;
  team_name?: string;
  challenge?: string;
  challenge_name?: string;
  challenges_questions?: string;
  question_name?: string;
  score?: number;
  first_blood_score?: number;
  bonus_score?: number;
  negative_score?: number;
  answer_submitted?: string | null;
  answer_validity?: boolean | null;
  is_flag?: boolean;
  is_soft_deleted?: boolean;
  created_at?: string;
};

export type ScoreWriteInput = {
  user?: string;
  team?: string;
  challenge?: string;
  challenges_questions?: string;
  score?: number;
  first_blood_score?: number;
  bonus_score?: number;
  negative_score?: number;
  answer_submitted?: string;
  answer_validity?: boolean;
  is_flag?: boolean;
};

export type ScoreListFilters = {
  search?: string;
  team?: string;
  user?: string;
  challenge?: string;
  question?: string;
  answer_validity?: string;
  score_min?: string;
  score_max?: string;
  show_deleted?: string;
  ordering?: string;
  limit?: string;
};

export type MachineRow = {
  id: string;
  challenge?: string;
  challenge_name?: string;
  team?: string;
  team_name?: string;
  namespace?: string;
  pod_name?: string;
  machine_name?: string;
  ip_address?: string;
  os_type?: string;
  remote_name?: string;
  is_active?: boolean;
  is_deleted?: boolean;
  blocked?: boolean;
  blocked_at?: string | null;
  expires_at?: string | null;
  is_for_lms?: boolean;
  spawned_by?: {
    id?: string;
    username?: string;
    email?: string;
    name?: string;
  };
  created_at?: string;
  updated_at?: string;
};

export type MachineWriteInput = {
  challenge?: string;
  team?: string;
  namespace?: string;
  pod_name?: string;
  machine_name?: string;
  ip_address?: string;
  os_type?: string;
  remote_name?: string;
  is_active?: boolean;
  is_deleted?: boolean;
  blocked?: boolean;
  expires_at?: string | null;
  is_for_lms?: boolean;
};

export type MachineListFilters = {
  team?: string;
  challenge?: string;
  is_active?: string;
  is_deleted?: string;
  blocked?: string;
  ip?: string;
  namespace?: string;
  search?: string;
  show_deleted?: string;
  ordering?: string;
  limit?: string;
};

export type NotificationRow = {
  id: string;
  title?: string;
  message?: string;
  team?: string | null;
  team_name?: string;
  type?: string;
  category?: string;
  created_at?: string;
  is_read?: boolean;
  recipient_count?: number;
  user_ids?: string[];
};

export type ActivityLog = {
  id: number | string;
  type?: string;
  message?: string;
  ip_address?: string;
  date_time?: string;
  submitted_by?: string;
  submitted_by_detail?: {
    id?: string;
    username?: string;
    email?: string;
    name?: string;
    last_name?: string;
  };
  playing_hackathon?: string;
  duplicated_from?: string | null;
  created_at?: string;
};

export type ActivityLogWriteInput = {
  type: string;
  message?: string;
  ip_address?: string;
  submitted_by?: string;
  duplicated_from?: string | null;
};

export const ACTIVITY_LOG_TYPES = [
  "success_submissions",
  "invalid_submissions",
  "duplicated_submissions",
  "spawn_machine",
  "stop_machine",
  "user_created",
  "user_login",
  "brute_force_login",
  "rate_limit_exceeded",
  "otp_rate_limit_exceeded",
  "unknown_error",
] as const;

export type ActivityLogListFilters = {
  type?: string;
  types?: string;
  user?: string;
  ip?: string;
  search?: string;
  date_after?: string;
  date_before?: string;
  ordering?: string;
  limit?: string;
};

export type AuditLog = {
  id: string;
  actor?: string;
  actor_detail?: {
    id?: string;
    username?: string;
    email?: string;
    name?: string;
  };
  actor_system_role?: string;
  actor_hackathon_role?: string;
  action?: string;
  category?: string;
  resource_type?: string;
  resource_id?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  extra?: Record<string, unknown>;
  success?: boolean;
  is_break_glass?: boolean;
  created_at?: string;
  ip_address?: string;
  request_path?: string;
  request_method?: string;
};

export async function listScores(
  hackathonId: string,
  filters?: ScoreListFilters,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/scores`, {
      ...filters,
      limit: filters?.limit ?? "100",
    }),
  );
  return asList<ScoreRow>(unwrapHaasResult(result).data);
}

export async function getScore(hackathonId: string, scoreId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<ScoreRow>>>(
    haasApiPath(`hackathons/${hackathonId}/scores/${scoreId}`),
  );
  return unwrapHaasResult(result).data;
}

export async function createScore(
  hackathonId: string,
  body: ScoreWriteInput,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<ScoreRow>>>(
    haasApiPath(`hackathons/${hackathonId}/scores`),
    { method: "POST", body },
  );
  return unwrapHaasResult(result).data;
}

export async function updateScore(
  hackathonId: string,
  scoreId: string,
  body: Partial<ScoreWriteInput>,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<ScoreRow>>>(
    haasApiPath(`hackathons/${hackathonId}/scores/${scoreId}`),
    { method: "PATCH", body },
  );
  return unwrapHaasResult(result).data;
}

export async function deleteScore(hackathonId: string, scoreId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/scores/${scoreId}`),
    { method: "DELETE" },
  );
  return unwrapHaasResult(result);
}

/** @deprecated Backend hard-deletes; use deleteScore */
export const softDeleteScore = deleteScore;

export async function listMachines(
  hackathonId: string,
  filters?: MachineListFilters,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/machines`, {
      ...filters,
      limit: filters?.limit ?? "100",
    }),
  );
  return asList<MachineRow>(unwrapHaasResult(result).data);
}

export async function getMachine(hackathonId: string, machineId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<MachineRow>>>(
    haasApiPath(`hackathons/${hackathonId}/machines/${machineId}`),
  );
  return unwrapHaasResult(result).data;
}

export async function createMachine(
  hackathonId: string,
  body: MachineWriteInput,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<MachineRow>>>(
    haasApiPath(`hackathons/${hackathonId}/machines`),
    { method: "POST", body },
  );
  return unwrapHaasResult(result).data;
}

export async function updateMachine(
  hackathonId: string,
  machineId: string,
  body: Partial<MachineWriteInput>,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<MachineRow>>>(
    haasApiPath(`hackathons/${hackathonId}/machines/${machineId}`),
    { method: "PATCH", body },
  );
  return unwrapHaasResult(result).data;
}

export async function deleteMachine(hackathonId: string, machineId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/machines/${machineId}`),
    { method: "DELETE" },
  );
  return unwrapHaasResult(result);
}

export async function bulkSpawnMachines(
  hackathonId: string,
  body: { team_ids: string[]; challenge_ids: string[] },
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/machines/bulk-spawn`),
    { method: "POST", body },
  );
  return unwrapHaasResult(result);
}

export async function stopMachine(hackathonId: string, machineId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/machines/${machineId}/stop`),
    { method: "POST", body: {} },
  );
  return unwrapHaasResult(result);
}

export async function blockMachine(hackathonId: string, machineId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/machines/${machineId}/block`),
    { method: "POST", body: {} },
  );
  return unwrapHaasResult(result);
}

export async function bulkStopMachines(
  hackathonId: string,
  body: {
    machine_ids?: string[];
    all_active?: boolean;
    team_id?: string | null;
    challenge_id?: string | null;
  },
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/machines/bulk-stop`),
    { method: "POST", body },
  );
  return unwrapHaasResult(result);
}

export async function listNotifications(hackathonId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/notifications`, { limit: "100" }),
  );
  return asList<NotificationRow>(unwrapHaasResult(result).data);
}

export async function sendNotification(
  hackathonId: string,
  body: {
    title: string;
    message: string;
    team?: string | null;
    type?: string;
    category?: string;
    users_for?: string[];
  },
) {
  const result = await callAppApi<
    ApiResult<HaasForwardPayload<NotificationRow>>
  >(haasApiPath(`hackathons/${hackathonId}/notifications`), {
    method: "POST",
    body,
  });
  return unwrapHaasResult(result).data;
}

export async function listActivityLogs(
  hackathonId: string,
  filters?: ActivityLogListFilters,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/activity-logs`, {
      ...filters,
      limit: filters?.limit ?? "100",
    }),
  );
  return asList<ActivityLog>(unwrapHaasResult(result).data);
}

export async function getActivityLog(
  hackathonId: string,
  logId: string | number,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<ActivityLog>>>(
    haasApiPath(`hackathons/${hackathonId}/activity-logs/${logId}`),
  );
  return unwrapHaasResult(result).data;
}

export async function createActivityLog(
  hackathonId: string,
  body: ActivityLogWriteInput,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<ActivityLog>>>(
    haasApiPath(`hackathons/${hackathonId}/activity-logs`),
    { method: "POST", body },
  );
  return unwrapHaasResult(result).data;
}

export async function updateActivityLog(
  hackathonId: string,
  logId: string | number,
  body: Partial<ActivityLogWriteInput>,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<ActivityLog>>>(
    haasApiPath(`hackathons/${hackathonId}/activity-logs/${logId}`),
    { method: "PATCH", body },
  );
  return unwrapHaasResult(result).data;
}

export async function deleteActivityLog(
  hackathonId: string,
  logId: string | number,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/activity-logs/${logId}`),
    { method: "DELETE" },
  );
  return unwrapHaasResult(result);
}

export async function getAuditLog(hackathonId: string, logId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<AuditLog>>>(
    haasApiPath(`hackathons/${hackathonId}/audit-logs/${logId}`),
  );
  return unwrapHaasResult(result).data;
}

export async function listAuditLogs(
  hackathonId: string,
  filters?: { action?: string; category?: string },
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/audit-logs`, {
      ...filters,
      limit: "100",
    }),
  );
  return asList<AuditLog>(unwrapHaasResult(result).data);
}

export async function getEventAnalytics(hackathonId: string) {
  const result = await callAppApi<
    ApiResult<HaasForwardPayload<HackathonAnalytics>>
  >(haasApiPath(`hackathons/${hackathonId}/analytics`));
  return unwrapHaasResult(result).data;
}

/** CSV download — response is not JSON envelope. */
export async function downloadAnalyticsExport(hackathonId: string) {
  const response = await fetch(
    haasApiPath(`hackathons/${hackathonId}/analytics/export`),
    { credentials: "same-origin" },
  );
  if (!response.ok) {
    throw new Error(`Export failed (${response.status})`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hackathon-${hackathonId}-scores.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
