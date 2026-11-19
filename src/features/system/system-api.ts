import {
  haasGet,
  haasList,
  haasListAll,
  haasSend,
  toFormData,
} from "@/lib/haas-api";
import type { UserBrief } from "@/types";

export type SystemStats = {
  hackathons?: number;
  hackathons_active?: number;
  playing?: number;
  teams?: number;
  users?: number;
  active_machines?: number;
  role_bindings?: number;
  hackathon_admins?: number;
};

export type SystemUser = {
  id: string;
  username?: string;
  email?: string;
  name?: string;
  last_name?: string;
  full_name?: string;
  user_type?: string;
  organization_name?: string | null;
  organization_info?: string | null;
  referer?: string | null;
  referer_detail?: {
    id: string;
    name?: string;
    slug?: string;
    description?: string;
    is_active?: boolean;
  } | null;
  media?: string | null;
  media_url?: string | null;
  is_block?: boolean;
  blocked_at?: string | null;
  block_reason?: string;
  is_active?: boolean;
  is_staff?: boolean;
  is_verified?: boolean;
  email_verified?: boolean;
  is_lms_user?: boolean;
  phone_number?: string | null;
  gender?: string | null;
  cnic?: string | null;
  skill_type?: string | null;
  education?: unknown;
  certifications?: unknown;
  expertise?: unknown;
  team_type?: unknown;
  two_factor_enabled?: boolean;
  access_failed_count?: number;
  /** Pending email OTP (system operators only). */
  otp?: string | null;
  otp_expires_at?: string | null;
  created_in?: string | null;
  created_in_hackathon?: {
    id: string;
    name?: string;
    display_name?: string | null;
    playing_hackathon_id?: string | null;
  } | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  created_by_detail?:
    | (UserBrief & {
        user_type?: string;
        is_staff?: boolean;
        is_superuser?: boolean;
        is_platform_admin?: boolean;
      })
    | null;
  updated_by_detail?:
    | (UserBrief & {
        user_type?: string;
        is_staff?: boolean;
        is_superuser?: boolean;
        is_platform_admin?: boolean;
      })
    | null;
};

export type SystemUserCreateInput = {
  username: string;
  email: string;
  password: string;
  name?: string;
  last_name?: string;
  user_type?: string;
  is_verified?: boolean;
  email_verified?: boolean;
};

/** Hackathon main-admin binding (platform operators assign per event). */
export type SystemAdmin = {
  id: string;
  user?: string;
  hackathon?: string;
  hackathon_name?: string;
  notes?: string;
  is_active?: boolean;
  granted_at?: string;
  user_detail?: UserBrief;
};

export function getSystemStats() {
  return haasGet<SystemStats>("system/stats");
}

export function listSystemUsers(filters?: {
  search?: string;
  is_block?: string;
  /** Referer id, slug, or "none". */
  referer?: string;
  /** Users created or updated by staff / Root. */
  has_created_by?: string;
  staff_provisioned?: string;
}) {
  return haasList<SystemUser>("system/users", {
    ...filters,
    // Prefer explicit staff_provisioned; keep has_created_by for older callers.
    staff_provisioned:
      filters?.staff_provisioned ?? filters?.has_created_by ?? undefined,
    limit: "100",
  });
}

export type SystemUserUpdateInput = Partial<{
  education: unknown;
  certifications: unknown;
  expertise: unknown;
  team_type: unknown;
  organization_info: string | null;
  username: string;
  email: string;
  password: string;
  name: string;
  last_name: string;
  phone_number: string;
  gender: string;
  cnic: string;
  user_type: string;
  skill_type: string;
  is_active: boolean;
  is_verified: boolean;
  email_verified: boolean;
  is_lms_user: boolean;
}>;

export function getSystemUser(userId: string) {
  return haasGet<SystemUser>(`system/users/${userId}`);
}

export function updateSystemUser(
  userId: string,
  body: SystemUserUpdateInput,
  options?: { file?: File | null; clearMedia?: boolean },
) {
  const path = `system/users/${userId}`;
  // Never send blank / sentinel password on update — keeps existing hash.
  const safeBody: SystemUserUpdateInput = { ...body };
  const pw = typeof safeBody.password === "string" ? safeBody.password.trim() : "";
  if (!pw || pw.toLowerCase() === "undefined" || pw.toLowerCase() === "null") {
    delete safeBody.password;
  } else {
    safeBody.password = pw;
  }
  if (!options?.file && !options?.clearMedia) {
    return haasSend<SystemUser>(path, { method: "PATCH", body: safeBody });
  }
  return haasSend<SystemUser>(path, {
    method: "PATCH",
    // Multipart has no null: an empty value clears a nullable field.
    // Skip undefined so FormData never gets String(undefined) === "undefined".
    body: toFormData(
      Object.fromEntries(
        Object.entries(safeBody)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, v === null ? "" : v]),
      ),
      {
        file: options.file,
        flags: { clear_media: options.clearMedia },
      },
    ),
  });
}

export function createSystemUser(body: SystemUserCreateInput) {
  return haasSend<SystemUser>("system/users", { method: "POST", body });
}

export function blockSystemUser(userId: string, reason: string) {
  return haasSend<unknown>(`system/users/${userId}/block`, {
    method: "POST",
    body: { reason },
  });
}

export function unblockSystemUser(userId: string) {
  return haasSend<unknown>(`system/users/${userId}/unblock`, {
    method: "POST",
    body: {},
  });
}

export function listSystemAdmins(filters?: {
  hackathon?: string;
  user?: string;
}) {
  return haasList<SystemAdmin>("system/admins", { ...filters, limit: "100" });
}

export function grantSystemAdmin(body: {
  user: string;
  hackathon: string;
  notes?: string;
}) {
  return haasSend<SystemAdmin>("system/admins", { method: "POST", body });
}

export function revokeSystemAdmin(bindingId: string) {
  return haasSend<unknown>(`system/admins/${bindingId}`, { method: "DELETE" });
}

export function listSystemAudit(filters?: {
  hackathon?: string;
  action?: string;
  category?: string;
}) {
  return haasList<Record<string, unknown>>("system/audit", {
    ...filters,
    limit: "100",
  });
}

export function listSystemActivity(filters?: {
  type?: string;
  user?: string;
  hackathon?: string;
  search?: string;
  ip?: string;
  ip_address?: string;
  date_after?: string;
  date_before?: string;
  ordering?: string;
}) {
  return haasList<Record<string, unknown>>("system/activity", {
    ...filters,
    limit: "100",
  });
}

export type ChangeLogPriority =
  | "critical"
  | "big_change"
  | "need_to_test"
  | "info";

export type PlatformChangeLog = {
  id: string;
  change_date: string;
  changed_by_name?: string;
  title: string;
  affects?: string;
  worst_case?: string;
  what_to_test?: string;
  status: string;
  priority?: ChangeLogPriority;
  priority_label?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  created_by_username?: string | null;
  updated_by?: string | null;
  updated_by_username?: string | null;
};

export type PlatformChangeLogInput = {
  change_date?: string;
  changed_by_name?: string;
  title: string;
  affects?: string;
  worst_case?: string;
  what_to_test?: string;
  status: string;
};

export type PlatformChangeLogOptions = {
  statuses: string[];
  changed_by: string[];
  changes: string[];
  affects: string[];
};

export function listPlatformChangeLogs(filters?: {
  status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}) {
  return haasListAll<PlatformChangeLog>("system/change-log", {
    ...filters,
    limit: "100",
  });
}

export function getPlatformChangeLogOptions() {
  return haasGet<PlatformChangeLogOptions>("system/change-log/field-options");
}

export function createPlatformChangeLog(body: PlatformChangeLogInput) {
  return haasSend<PlatformChangeLog>("system/change-log", {
    method: "POST",
    body,
  });
}

export function updatePlatformChangeLog(
  id: string,
  body: Partial<PlatformChangeLogInput>,
) {
  return haasSend<PlatformChangeLog>(`system/change-log/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deletePlatformChangeLog(id: string) {
  return haasSend<unknown>(`system/change-log/${id}`, { method: "DELETE" });
}

export async function downloadPlatformChangeLogSheet(filters?: {
  status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}) {
  const { haasApiPath } = await import("@/lib/haas-api");
  const path = haasApiPath("system/change-log/export", filters);
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to download change log sheet");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "platform-change-log.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function getPlatformChangeLogGoogleSheet() {
  return haasGet<{
    sheet_id?: string;
    sheet_url?: string;
    push_configured?: boolean;
  }>("system/change-log/google-sheet");
}

export function syncPlatformChangeLogGoogle(body?: {
  direction?: "pull" | "push" | "both";
  replace_all?: boolean;
}) {
  const direction = body?.direction || "both";
  // Pull treats the Google Sheet as source of truth unless replace_all is false.
  const replace_all =
    body?.replace_all ?? (direction === "pull" || direction === "both");
  return haasSend<{
    created?: number;
    updated?: number;
    deleted?: number;
    pushed?: boolean;
    rows?: number;
    sheet_rows?: number;
    sheet_url?: string;
    push_configured?: boolean;
    push_skipped?: string;
  }>("system/change-log/sync-google", {
    method: "POST",
    body: { direction, replace_all },
  });
}

/** Platform-wide feature toggles (LMS / Academy for the player portal). */
export type PlatformSettings = {
  id: string;
  is_lms_enabled: boolean;
  lms_disabled_message: string;
  disposable_namespace_idle_minutes: number;
  updated_at?: string;
};

export type PlatformSettingsUpdate = Partial<{
  is_lms_enabled: boolean;
  lms_disabled_message: string;
  disposable_namespace_idle_minutes: number;
}>;

/** TEMPORARY EVENT FEATURE — referer allow-list gate (see accounts/referer_gate.py). */
export type RefererRegistrationGate = {
  id: string;
  is_enabled: boolean;
  referer?: string | null;
  referer_detail?: {
    id: string;
    name?: string;
    slug?: string;
    description?: string;
    is_active?: boolean;
  } | null;
  allowed_emails: string;
  allowed_email_count?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  denial_message: string;
  apply_to_registration: boolean;
  apply_to_team_create: boolean;
  apply_to_team_join: boolean;
  bypass_staff: boolean;
  is_active_now?: boolean;
  /** Why the gate is not enforcing right now (null when active). */
  inactive_reason?: string | null;
  updated_at?: string;
};

export type RefererRegistrationGateUpdate = Partial<{
  is_enabled: boolean;
  referer: string | null;
  allowed_emails: string;
  starts_at: string | null;
  ends_at: string | null;
  denial_message: string;
  apply_to_registration: boolean;
  apply_to_team_create: boolean;
  apply_to_team_join: boolean;
  bypass_staff: boolean;
}>;

/** Team membership row on platform user detail. */
export type UserTeamMembership = {
  id: string;
  user?: string;
  team?: string;
  team_detail?: {
    id: string;
    name?: string;
    team_code?: string;
    is_active?: boolean;
    is_blocked?: boolean;
    register_as?: string | null;
    referer?: string | null;
    playing_in?: { id: string; name?: string; display_name?: string }[];
  } | null;
  referer_detail?: {
    id: string;
    name?: string;
    slug?: string;
  } | null;
  is_captain?: boolean;
  is_approved?: boolean;
  is_rejected?: boolean;
  is_active?: boolean;
  is_default?: boolean;
  joined_at?: string;
  approved_at?: string | null;
  updated_at?: string;
};

export type UserTeamMembershipUpdate = Partial<{
  is_captain: boolean;
  is_approved: boolean;
  is_rejected: boolean;
  is_active: boolean;
  is_default: boolean;
}>;

export type SystemUserAnalytics = {
  memberships: {
    total: number;
    active: number;
    captain: number;
    pending: number;
  };
  scores: {
    total: number;
    base: number;
    first_blood: number;
    bonus: number;
    solves: number;
    rows: number;
  };
  machines: {
    total: number;
    active: number;
  };
  top_scores: Array<{
    id: string;
    challenge?: string | null;
    team?: string | null;
    hackathon?: string | null;
    score?: number;
    first_blood_score?: number;
    bonus_score?: number;
    created_at?: string;
  }>;
  recent_activity: Array<{
    type?: string;
    message?: string;
    date_time?: string;
  }>;
};

export function listSystemUserMemberships(
  userId: string,
  filters?: { show_inactive?: string },
) {
  return haasList<UserTeamMembership>(`system/users/${userId}/memberships`, {
    show_inactive: filters?.show_inactive ?? "1",
    limit: "200",
  });
}

export function createSystemUserMembership(
  userId: string,
  body: { team: string; is_captain?: boolean; is_approved?: boolean },
) {
  return haasSend<UserTeamMembership>(`system/users/${userId}/memberships`, {
    method: "POST",
    body,
  });
}

export function updateSystemUserMembership(
  userId: string,
  membershipId: string,
  body: UserTeamMembershipUpdate,
) {
  return haasSend<UserTeamMembership>(
    `system/users/${userId}/memberships/${membershipId}`,
    { method: "PATCH", body },
  );
}

export function removeSystemUserMembership(
  userId: string,
  membershipId: string,
) {
  return haasSend<UserTeamMembership>(
    `system/users/${userId}/memberships/${membershipId}`,
    { method: "DELETE" },
  );
}

export function getSystemUserAnalytics(userId: string) {
  return haasGet<SystemUserAnalytics>(`system/users/${userId}/analytics`);
}

export function getPlatformSettings() {
  return haasGet<PlatformSettings>("system/platform-settings");
}

export function patchPlatformSettings(body: PlatformSettingsUpdate) {
  return haasSend<PlatformSettings>("system/platform-settings", {
    method: "PATCH",
    body,
  });
}

export function getRefererRegistrationGate() {
  return haasGet<RefererRegistrationGate>("system/referer-registration-gate");
}

export function patchRefererRegistrationGate(
  body: RefererRegistrationGateUpdate,
) {
  return haasSend<RefererRegistrationGate>("system/referer-registration-gate", {
    method: "PATCH",
    body,
  });
}
