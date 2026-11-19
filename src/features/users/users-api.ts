import { formatPersonName } from "@/lib/display-name";
import { haasGet, haasList, haasSend, toFormData } from "@/lib/haas-api";

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
  is_staff?: boolean;
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
  is_active?: boolean;
};

export function listEventUsers(
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
  return haasList<EventUser>(`hackathons/${hackathonId}/users`, {
    ...filters,
    limit: filters?.limit ?? "100",
  });
}

export function getEventUser(hackathonId: string, userId: string) {
  return haasGet<EventUser>(`hackathons/${hackathonId}/users/${userId}`);
}

export function updateEventUser(
  hackathonId: string,
  userId: string,
  body: EventUserUpdateInput,
  options?: { file?: File | null; clearMedia?: boolean },
) {
  const path = `hackathons/${hackathonId}/users/${userId}`;
  const safeBody: EventUserUpdateInput = { ...body };
  const pw = typeof safeBody.password === "string" ? safeBody.password.trim() : "";
  if (!pw || pw.toLowerCase() === "undefined" || pw.toLowerCase() === "null") {
    delete safeBody.password;
  } else {
    safeBody.password = pw;
  }
  const needsMultipart = Boolean(options?.file || options?.clearMedia);
  if (!needsMultipart) {
    return haasSend<EventUser>(path, { method: "PATCH", body: safeBody });
  }
  return haasSend<EventUser>(path, {
    method: "PATCH",
    body: toFormData(
      Object.fromEntries(
        Object.entries(safeBody as Record<string, unknown>).filter(
          ([, v]) => v !== undefined,
        ),
      ),
      {
        file: options?.file,
        flags: { clear_media: options?.clearMedia },
      },
    ),
  });
}

export function createEventUser(
  hackathonId: string,
  body: EventUserCreateInput,
  options?: { file?: File | null },
) {
  const path = `hackathons/${hackathonId}/users`;
  if (!options?.file) {
    return haasSend<EventUser>(path, { method: "POST", body });
  }
  return haasSend<EventUser>(path, {
    method: "POST",
    body: toFormData(body as Record<string, unknown>, { file: options.file }),
  });
}

export async function activateEventUser(hackathonId: string, userId: string) {
  return updateEventUser(hackathonId, userId, { is_active: true });
}

export function deleteEventUser(hackathonId: string, userId: string) {
  return haasSend<unknown>(`hackathons/${hackathonId}/users/${userId}`, {
    method: "DELETE",
  });
}

export function blockEventUser(
  hackathonId: string,
  userId: string,
  reason: string,
) {
  return haasSend<EventUser>(`hackathons/${hackathonId}/users/${userId}/block`, {
    method: "POST",
    body: { reason },
  });
}

export function unblockEventUser(hackathonId: string, userId: string) {
  return haasSend<EventUser>(
    `hackathons/${hackathonId}/users/${userId}/unblock`,
    { method: "POST", body: {} },
  );
}

export function eventUserLabel(user: EventUser): string {
  return formatPersonName(user, user.id);
}

export function eventUserDetailPath(hackathonId: string, userId: string) {
  return `/events/${hackathonId}/users/${userId}`;
}
