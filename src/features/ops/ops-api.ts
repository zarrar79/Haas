import { haasGet, haasList, haasSend } from "@/lib/haas-api";
import type { UserBrief } from "@/types";

export type ScoreRow = {
  id: string;
  user?: string;
  user_detail?: UserBrief;
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
  spawned_by?: UserBrief;
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
  submitted_by_detail?: UserBrief;
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

export function listScores(hackathonId: string, filters?: ScoreListFilters) {
  return haasList<ScoreRow>(`hackathons/${hackathonId}/scores`, {
    ...filters,
    limit: filters?.limit ?? "100",
  });
}

export function getScore(hackathonId: string, scoreId: string) {
  return haasGet<ScoreRow>(`hackathons/${hackathonId}/scores/${scoreId}`);
}

export function createScore(hackathonId: string, body: ScoreWriteInput) {
  return haasSend<ScoreRow>(`hackathons/${hackathonId}/scores`, {
    method: "POST",
    body,
  });
}

export function updateScore(
  hackathonId: string,
  scoreId: string,
  body: Partial<ScoreWriteInput>,
) {
  return haasSend<ScoreRow>(`hackathons/${hackathonId}/scores/${scoreId}`, {
    method: "PATCH",
    body,
  });
}

export function deleteScore(hackathonId: string, scoreId: string) {
  return haasSend<unknown>(`hackathons/${hackathonId}/scores/${scoreId}`, {
    method: "DELETE",
  });
}

/** @deprecated Backend hard-deletes; use deleteScore */
export const softDeleteScore = deleteScore;

export function listMachines(
  hackathonId: string,
  filters?: MachineListFilters,
) {
  return haasList<MachineRow>(`hackathons/${hackathonId}/machines`, {
    ...filters,
    limit: filters?.limit ?? "100",
  });
}

export function getMachine(hackathonId: string, machineId: string) {
  return haasGet<MachineRow>(`hackathons/${hackathonId}/machines/${machineId}`);
}

export function createMachine(hackathonId: string, body: MachineWriteInput) {
  return haasSend<MachineRow>(`hackathons/${hackathonId}/machines`, {
    method: "POST",
    body,
  });
}

export function updateMachine(
  hackathonId: string,
  machineId: string,
  body: Partial<MachineWriteInput>,
) {
  return haasSend<MachineRow>(`hackathons/${hackathonId}/machines/${machineId}`, {
    method: "PATCH",
    body,
  });
}

export function deleteMachine(hackathonId: string, machineId: string) {
  return haasSend<unknown>(`hackathons/${hackathonId}/machines/${machineId}`, {
    method: "DELETE",
  });
}

export function bulkSpawnMachines(
  hackathonId: string,
  body: { team_ids: string[]; challenge_ids: string[] },
) {
  return haasSend<unknown>(`hackathons/${hackathonId}/machines/bulk-spawn`, {
    method: "POST",
    body,
  });
}

export function stopMachine(hackathonId: string, machineId: string) {
  return haasSend<unknown>(
    `hackathons/${hackathonId}/machines/${machineId}/stop`,
    { method: "POST", body: {} },
  );
}

export function blockMachine(hackathonId: string, machineId: string) {
  return haasSend<unknown>(
    `hackathons/${hackathonId}/machines/${machineId}/block`,
    { method: "POST", body: {} },
  );
}

export function bulkStopMachines(
  hackathonId: string,
  body: {
    machine_ids?: string[];
    all_active?: boolean;
    team_id?: string | null;
    challenge_id?: string | null;
  },
) {
  return haasSend<unknown>(`hackathons/${hackathonId}/machines/bulk-stop`, {
    method: "POST",
    body,
  });
}

export function listNotifications(hackathonId: string) {
  return haasList<NotificationRow>(`hackathons/${hackathonId}/notifications`, {
    limit: "100",
  });
}

export function sendNotification(
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
  return haasSend<NotificationRow>(`hackathons/${hackathonId}/notifications`, {
    method: "POST",
    body,
  });
}

export function updateNotification(
  hackathonId: string,
  notificationId: string,
  body: { title?: string; message?: string },
) {
  return haasSend<NotificationRow>(
    `hackathons/${hackathonId}/notifications/${notificationId}`,
    { method: "PATCH", body },
  );
}

export function deleteNotification(hackathonId: string, notificationId: string) {
  return haasSend<unknown>(
    `hackathons/${hackathonId}/notifications/${notificationId}`,
    { method: "DELETE" },
  );
}

export function listActivityLogs(
  hackathonId: string,
  filters?: ActivityLogListFilters,
) {
  return haasList<ActivityLog>(`hackathons/${hackathonId}/activity-logs`, {
    ...filters,
    limit: filters?.limit ?? "100",
  });
}

export function getActivityLog(hackathonId: string, logId: string | number) {
  return haasGet<ActivityLog>(
    `hackathons/${hackathonId}/activity-logs/${logId}`,
  );
}

export function createActivityLog(
  hackathonId: string,
  body: ActivityLogWriteInput,
) {
  return haasSend<ActivityLog>(`hackathons/${hackathonId}/activity-logs`, {
    method: "POST",
    body,
  });
}

export function updateActivityLog(
  hackathonId: string,
  logId: string | number,
  body: Partial<ActivityLogWriteInput>,
) {
  return haasSend<ActivityLog>(
    `hackathons/${hackathonId}/activity-logs/${logId}`,
    { method: "PATCH", body },
  );
}

export function deleteActivityLog(hackathonId: string, logId: string | number) {
  return haasSend<unknown>(`hackathons/${hackathonId}/activity-logs/${logId}`, {
    method: "DELETE",
  });
}
