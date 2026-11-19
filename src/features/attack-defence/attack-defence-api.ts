/**
 * Haas-Client bindings for Attack & Defence.
 * All calls go through /api/haas/... → src/apps/haas (not /api/ad/).
 */
import { haasGet, haasList, haasSend, toFormData } from "@/lib/haas-api";

export type AdEventStatus =
  | "draft"
  | "scheduled"
  | "running"
  | "paused"
  | "ended";

export type AdEvent = {
  id: string;
  name: string;
  description?: string;
  global_namespace?: string;
  global_namespace_id?: string | null;
  status: AdEventStatus | string;
  total_rounds: number;
  round_duration_sec: number;
  uptime_check_interval_sec?: number;
  start_datetime?: string | null;
  end_datetime?: string | null;
  duration_minutes?: number | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AdEventWrite = {
  name?: string;
  description?: string;
  global_namespace?: string;
  status?: string;
  total_rounds?: number;
  round_duration_sec?: number;
  uptime_check_interval_sec?: number;
  start_datetime?: string | null;
  is_active?: boolean;
};

export type AdPause = {
  id: string;
  ad_event: string;
  type: "scheduled" | "runtime" | string;
  start_time?: string | null;
  end_time?: string | null;
  duration?: string | null;
  duration_seconds?: number;
  after_round?: number | null;
  round_time?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
};

export type AdPauseWrite = {
  start_time?: string | null;
  duration_sec: number;
  after_round?: number | null;
  round_time?: string | null;
  status?: string;
};

export type AdNamespace = {
  id: string;
  name: string;
  ip_pool?: string;
  is_active?: boolean;
  status?: string;
};

export type AdChallenge = {
  id: string;
  name: string;
  description?: string;
  description_markdown?: string;
  base_points?: number;
  yaml_manifest?: string;
  attachment?: string | null;
  attachment_url?: string | null;
  machine_count?: number;
  service_count?: number;
  machine_ip?: string | null;
  machine_status?: string | null;
  is_active?: boolean;
};

export type AdServiceCategory = {
  id: string;
  name: string;
  default_port: number;
  protocol?: string;
  tier?: string;
  offense_points?: number;
  defense_penalty?: number;
  description?: string;
  is_active?: boolean;
};

export type AdService = {
  id: string;
  challenge: string;
  challenge_name?: string;
  category: string;
  category_name?: string;
  name: string;
  port?: number | null;
  slot: string;
  probe_script?: string;
  service_status?: string;
  effective_port?: number;
  last_up_status_updated?: string | null;
};

export type AdMachine = {
  id: string;
  challenge: string;
  challenge_name?: string;
  playing_team?: string | null;
  playing_team_id?: string | null;
  team_id?: string | null;
  team_name?: string | null;
  vm_name?: string;
  hostname?: string;
  ip_address?: string | null;
  namespace?: string | null;
  k8s_namespace?: string;
  deploy_mode?: string;
  yaml_manifest?: string;
  status?: string;
  /** Pepper-mixed 64-character token set on successful deploy; empty until then. */
  auth_token?: string;
  services?: AdService[];
  services_up?: number;
  services_down?: number;
  services_unknown?: number;
  services_total?: number;
};

export type AdPlaying = {
  id: string;
  event: string;
  is_open?: boolean;
  is_active?: boolean;
  created_at?: string;
};

export type AdTeamMember = {
  id: string;
  user_id?: string | null;
  username?: string;
  email?: string | null;
  is_captain?: boolean;
  is_approved?: boolean;
};

export type AdPlayingTeam = {
  id: string;
  ad_playing: string;
  team: string;
  team_name?: string;
  team_code?: string | null;
  challenge: string;
  challenge_name?: string;
  joined_at?: string;
  is_active?: boolean;
  machine_id?: string | null;
  machine_name?: string | null;
  machine_status?: string | null;
  machine_ip?: string | null;
  services_total?: number;
  services_up?: number;
  services_down?: number;
  flags_total?: number;
  flags_captured?: number;
  member_count?: number;
  members?: AdTeamMember[];
};

export type AdFlag = {
  id: string;
  flag: string;
  round: string;
  round_number?: number | null;
  service: string;
  service_name?: string;
  service_slot?: string;
  challenge_id?: string | null;
  challenge_name?: string | null;
  machine_ip?: string | null;
  is_active?: boolean;
  is_captured?: boolean;
};

export type AdRound = {
  id: string;
  ad_playing: string;
  round_number: number;
  start_time?: string | null;
  end_time?: string | null;
  round_status?: string;
};

export type AdFlagSubmission = {
  id: string;
  defender_team: string;
  attacker_team: string;
  service: string;
  is_valid: boolean;
  attack_score?: number;
  negative_score?: number;
  submit_time?: string;
  flag?: string;
};

export type AdUptimeCheck = {
  id: string;
  playing_team: string;
  service: string;
  round: string;
  round_check_count?: number;
  service_status?: string;
  check_time?: string;
};

export type AdUptimeFinal = {
  id: string;
  playing_team: string;
  service: string;
  round: string;
  round_check_count?: number;
  service_status?: string;
  check_time?: string;
};

export type AdTeamScore = {
  id: string;
  playing_team: string;
  round: string;
  initial_score?: number;
  uptime_score?: number;
  attack_score?: number;
  negative_score?: number;
  bonus_score?: number;
  total_score?: number;
};

export type AdScoreboardRow = {
  playing_team_id: string;
  team_id: string;
  initial_score: number;
  uptime_score: number;
  attack_score: number;
  negative_score: number;
  bonus_score: number;
  total_score: number;
};

/* ---- Events (CRUD under haas/ad/events) ---- */

export function listAdEvents(filters?: {
  search?: string;
  status?: string;
  is_active?: string;
}) {
  return haasList<AdEvent>("ad/events", {
    search: filters?.search,
    status: filters?.status,
    is_active: filters?.is_active,
    limit: "200",
  });
}

export function getAdEvent(id: string) {
  return haasGet<AdEvent>(`ad/events/${id}`);
}

export function createAdEvent(body: AdEventWrite & { name: string }) {
  return haasSend<AdEvent>("ad/events", { method: "POST", body });
}

export function updateAdEvent(id: string, body: AdEventWrite) {
  return haasSend<AdEvent>(`ad/events/${id}`, { method: "PATCH", body });
}

export function deleteAdEvent(id: string) {
  return haasSend<unknown>(`ad/events/${id}`, { method: "DELETE" });
}

/** Lifecycle via haas AdEventLifecycleView: readiness|start|pause|resume|stop|reopen */
export function adEventLifecycle(eventId: string, action: string) {
  return haasSend<AdEvent | { ready: boolean; playing_id?: string }>(
    `ad/events/${eventId}/${action}`,
    { method: "POST", body: {} },
  );
}

/* Also bind the already-defined flat control routes under /haas/events/... */
export function adEventStartFlat(eventId: string) {
  return haasSend<unknown>(`events/${eventId}/start`, { method: "POST", body: {} });
}
export function adEventPauseFlat(eventId: string) {
  return haasSend<unknown>(`events/${eventId}/pause`, { method: "POST", body: {} });
}
export function adEventResumeFlat(eventId: string) {
  return haasSend<unknown>(`events/${eventId}/resume`, { method: "POST", body: {} });
}
export function adEventStopFlat(eventId: string) {
  return haasSend<unknown>(`events/${eventId}/stop`, { method: "POST", body: {} });
}

/* ---- Pauses ---- */

export function listAdPauses(eventId: string) {
  return haasList<AdPause>(`ad/events/${eventId}/pauses`, { limit: "200" });
}

export function createAdPause(eventId: string, body: AdPauseWrite) {
  return haasSend<AdPause>(`ad/events/${eventId}/pauses`, {
    method: "POST",
    body,
  });
}

export function updateAdPause(
  eventId: string,
  pauseId: string,
  body: Partial<AdPauseWrite>,
) {
  return haasSend<AdPause>(`ad/events/${eventId}/pauses/${pauseId}`, {
    method: "PATCH",
    body,
  });
}

export function deleteAdPause(eventId: string, pauseId: string) {
  return haasSend<unknown>(`ad/events/${eventId}/pauses/${pauseId}`, {
    method: "DELETE",
  });
}

/* ---- Namespaces ---- */

export function listAdNamespaces(filters?: {
  search?: string;
  is_active?: string;
  status?: string;
}) {
  return haasList<AdNamespace>("ad/namespaces", {
    search: filters?.search,
    is_active: filters?.is_active,
    status: filters?.status,
    limit: "200",
  });
}

export function createAdNamespace(
  body: Partial<AdNamespace> & { name: string },
) {
  return haasSend<AdNamespace>("ad/namespaces", { method: "POST", body });
}

export function updateAdNamespace(id: string, body: Partial<AdNamespace>) {
  return haasSend<AdNamespace>(`ad/namespaces/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteAdNamespace(id: string) {
  return haasSend<unknown>(`ad/namespaces/${id}`, { method: "DELETE" });
}

/* ---- Challenges / categories / machines / services ---- */

export function listAdChallenges(filters?: { search?: string; is_active?: string }) {
  return haasList<AdChallenge>("ad/challenges", {
    search: filters?.search,
    is_active: filters?.is_active,
    limit: "200",
  });
}

export function createAdChallenge(body: Partial<AdChallenge> & { name: string }) {
  return haasSend<AdChallenge>("ad/challenges", { method: "POST", body });
}

export function updateAdChallenge(id: string, body: Partial<AdChallenge>) {
  return haasSend<AdChallenge>(`ad/challenges/${id}`, { method: "PATCH", body });
}

export function deleteAdChallenge(id: string) {
  return haasSend<unknown>(`ad/challenges/${id}`, { method: "DELETE" });
}

export function getAdChallenge(id: string) {
  return haasGet<AdChallenge>(`ad/challenges/${id}`);
}

export function uploadAdChallengeYaml(id: string, file: File) {
  return haasSend<AdChallenge>(`ad/challenges/${id}/upload-yaml`, {
    method: "POST",
    body: toFormData({}, { file, fileField: "yaml" }),
  });
}

export function spawnAdChallenge(id: string, file?: File | null) {
  return haasSend<{
    challenge: AdChallenge;
    spawned: AdMachine[];
    errors: { machine_id: string; error: string }[];
  }>(`ad/challenges/${id}/spawn`, {
    method: "POST",
    body: file
      ? toFormData({}, { file, fileField: "yaml" })
      : {},
  });
}

export function stopAdChallenge(id: string) {
  return haasSend<{
    challenge: AdChallenge;
    stopped: AdMachine[];
    errors: { machine_id: string; error: string }[];
  }>(`ad/challenges/${id}/stop`, {
    method: "POST",
    body: {},
  });
}

export function listAdServiceCategories(filters?: {
  search?: string;
  is_active?: string;
}) {
  return haasList<AdServiceCategory>("ad/service-categories", {
    search: filters?.search,
    is_active: filters?.is_active,
    limit: "200",
  });
}

export function createAdServiceCategory(
  body: Partial<AdServiceCategory> & { name: string; default_port: number },
) {
  return haasSend<AdServiceCategory>("ad/service-categories", {
    method: "POST",
    body,
  });
}

export function updateAdServiceCategory(
  id: string,
  body: Partial<AdServiceCategory>,
) {
  return haasSend<AdServiceCategory>(`ad/service-categories/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteAdServiceCategory(id: string) {
  return haasSend<unknown>(`ad/service-categories/${id}`, { method: "DELETE" });
}

export function listAdMachines(filters?: {
  challenge?: string;
  playing_team?: string;
  status?: string;
  search?: string;
}) {
  return haasList<AdMachine>("ad/machines", {
    challenge: filters?.challenge,
    playing_team: filters?.playing_team,
    status: filters?.status,
    search: filters?.search,
    limit: "200",
  });
}

export function createAdMachine(body: Partial<AdMachine> & { challenge: string }) {
  return haasSend<AdMachine>("ad/machines", { method: "POST", body });
}

export function updateAdMachine(id: string, body: Partial<AdMachine>) {
  return haasSend<AdMachine>(`ad/machines/${id}`, { method: "PATCH", body });
}

export function deleteAdMachine(id: string) {
  return haasSend<unknown>(`ad/machines/${id}`, { method: "DELETE" });
}

export function getAdMachine(id: string) {
  return haasGet<AdMachine>(`ad/machines/${id}`);
}

export function uploadAdMachineYaml(id: string, file: File) {
  return haasSend<AdMachine>(`ad/machines/${id}/upload-yaml`, {
    method: "POST",
    body: toFormData({}, { file, fileField: "yaml" }),
  });
}

export function spawnAdMachine(id: string, file?: File | null) {
  return haasSend<AdMachine>(`ad/machines/${id}/spawn`, {
    method: "POST",
    body: file ? toFormData({}, { file, fileField: "yaml" }) : {},
  });
}

export function stopAdMachine(id: string) {
  return haasSend<AdMachine>(`ad/machines/${id}/stop`, {
    method: "POST",
    body: {},
  });
}

export function listAdServices(filters?: { challenge?: string; category?: string }) {
  return haasList<AdService>("ad/services", {
    challenge: filters?.challenge,
    category: filters?.category,
    limit: "200",
  });
}

export function createAdService(
  body: Partial<AdService> & {
    challenge: string;
    category: string;
    name: string;
    slot: string;
  },
) {
  return haasSend<AdService>("ad/services", { method: "POST", body });
}

export function updateAdService(id: string, body: Partial<AdService>) {
  return haasSend<AdService>(`ad/services/${id}`, { method: "PATCH", body });
}

export function deleteAdService(id: string) {
  return haasSend<unknown>(`ad/services/${id}`, { method: "DELETE" });
}

export function getAdService(id: string) {
  return haasGet<AdService>(`ad/services/${id}`);
}

export function getAdServiceCategory(id: string) {
  return haasGet<AdServiceCategory>(`ad/service-categories/${id}`);
}

/* ---- Playings / teams / flags ---- */

export function listAdPlayings(filters?: { event?: string; is_active?: string }) {
  return haasList<AdPlaying>("ad/playings", {
    event: filters?.event,
    is_active: filters?.is_active,
    limit: "200",
  });
}

export function createAdPlaying(body: { event: string; is_open?: boolean; is_active?: boolean }) {
  return haasSend<AdPlaying>("ad/playings", { method: "POST", body });
}

export function updateAdPlaying(id: string, body: Partial<AdPlaying>) {
  return haasSend<AdPlaying>(`ad/playings/${id}`, { method: "PATCH", body });
}

export function deleteAdPlaying(id: string) {
  return haasSend<unknown>(`ad/playings/${id}`, { method: "DELETE" });
}

export function listAdPlayingTeams(filters?: {
  ad_playing?: string;
  team?: string;
  is_active?: string;
}) {
  return haasList<AdPlayingTeam>("ad/playing-teams", {
    ad_playing: filters?.ad_playing,
    team: filters?.team,
    is_active: filters?.is_active,
    limit: "200",
  });
}

export function createAdPlayingTeam(body: {
  ad_playing: string;
  team: string;
  challenge: string;
  is_active?: boolean;
}) {
  return haasSend<AdPlayingTeam>("ad/playing-teams", { method: "POST", body });
}

export function updateAdPlayingTeam(id: string, body: Partial<AdPlayingTeam>) {
  return haasSend<AdPlayingTeam>(`ad/playing-teams/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteAdPlayingTeam(id: string) {
  return haasSend<unknown>(`ad/playing-teams/${id}`, { method: "DELETE" });
}

export function listAdFlags(filters?: {
  round?: string;
  service?: string;
  is_active?: string;
}) {
  return haasList<AdFlag>("ad/flags", {
    round: filters?.round,
    service: filters?.service,
    is_active: filters?.is_active,
    limit: "200",
  });
}

/* ---- Read-only ops ---- */

export function listAdRounds(filters?: { ad_playing?: string }) {
  return haasList<AdRound>("ad/rounds", {
    ad_playing: filters?.ad_playing,
    limit: "200",
  });
}

export function listAdTeamScores(filters?: {
  round?: string;
  playing_team?: string;
}) {
  return haasList<AdTeamScore>("ad/team-scores", {
    round: filters?.round,
    playing_team: filters?.playing_team,
    limit: "200",
  });
}

export function listAdFlagSubmissions(filters?: {
  attacker_team?: string;
  defender_team?: string;
  service?: string;
}) {
  return haasList<AdFlagSubmission>("ad/flag-submissions", {
    attacker_team: filters?.attacker_team,
    defender_team: filters?.defender_team,
    service: filters?.service,
    limit: "200",
  });
}

export function listAdUptimeChecks(filters?: {
  round?: string;
  playing_team?: string;
}) {
  return haasList<AdUptimeCheck>("ad/uptime-checks", {
    round: filters?.round,
    playing_team: filters?.playing_team,
    limit: "200",
  });
}

export function listAdUptimeFinals(filters?: {
  round?: string;
  playing_team?: string;
}) {
  return haasList<AdUptimeFinal>("ad/uptime-finals", {
    round: filters?.round,
    playing_team: filters?.playing_team,
    limit: "200",
  });
}

/** Existing flat HAAS scoreboard route */
export async function getAdPlayingScoreboard(
  playingId: string,
  roundId?: string,
) {
  return haasGet<{ scoreboard: AdScoreboardRow[] }>(
    `playings/${playingId}/scoreboard`,
    { round_id: roundId },
  );
}
