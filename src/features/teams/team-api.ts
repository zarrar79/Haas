import { haasGet, haasList, haasSend, toFormData } from "@/lib/haas-api";
import type { UserBrief } from "@/types";

export type TeamMember = {
  id: string;
  user?: string;
  team?: string;
  is_captain?: boolean;
  is_approved?: boolean;
  is_rejected?: boolean;
  is_active?: boolean;
  joined_at?: string;
  approved_at?: string | null;
  user_detail?: UserBrief;
};

export type EventTeam = {
  id: string;
  name: string;
  team_code?: string;
  description?: string;
  affiliation?: string;
  website?: string;
  is_active?: boolean;
  is_blocked?: boolean;
  register_as?: string | null;
  /** K8s namespace (alias of name_code) */
  namespace?: string | null;
  name_code?: string | null;
  /** IP pool (alias of pool_ip) */
  ip_pool?: string | null;
  pool_ip?: string | null;
  subnet?: string | null;
  team_picture?: string | null;
  team_picture_url?: string | null;
  member_count?: number;
  members?: TeamMember[];
  created_in?: string | null;
  created_in_hackathon?: {
    id?: string;
    name?: string;
    display_name?: string;
    playing_hackathon_id?: string | null;
  } | null;
  created_at?: string | null;
};

export type TeamListFilters = {
  search?: string;
  status?: string;
  register_as?: string;
  is_active?: string;
  is_blocked?: string;
  hackathon?: string;
  limit?: string;
};

export type TeamWriteInput = {
  name?: string;
  description?: string;
  register_as?: string;
  affiliation?: string;
  website?: string;
  is_active?: boolean;
};

function teamCollectionPath(hackathonId: string | null | undefined) {
  return hackathonId ? `hackathons/${hackathonId}/teams` : "teams";
}

function teamItemPath(hackathonId: string | null | undefined, teamId: string) {
  return `${teamCollectionPath(hackathonId)}/${teamId}`;
}

export function listAllTeams(filters?: TeamListFilters) {
  return haasList<EventTeam>("teams", {
    search: filters?.search,
    status: filters?.status,
    register_as: filters?.register_as,
    is_active: filters?.is_active,
    is_blocked: filters?.is_blocked,
    hackathon: filters?.hackathon,
    limit: filters?.limit ?? "100",
  });
}

export function listTeams(hackathonId: string, filters?: TeamListFilters) {
  return haasList<EventTeam>(`hackathons/${hackathonId}/teams`, {
    search: filters?.search,
    status: filters?.status,
    register_as: filters?.register_as,
    is_active: filters?.is_active,
    is_blocked: filters?.is_blocked,
    limit: filters?.limit ?? "100",
  });
}

export function getTeam(
  hackathonId: string | null | undefined,
  teamId: string,
) {
  return haasGet<EventTeam>(teamItemPath(hackathonId, teamId));
}

export function createTeam(
  hackathonId: string | null | undefined,
  body: {
    name: string;
    description?: string;
    register_as?: string;
    affiliation?: string;
  },
  options?: { file?: File | null },
) {
  const path = teamCollectionPath(hackathonId);
  if (!options?.file) {
    return haasSend<EventTeam>(path, { method: "POST", body });
  }
  return haasSend<EventTeam>(path, {
    method: "POST",
    body: toFormData(body, { file: options.file }),
  });
}

export function updateTeam(
  hackathonId: string | null | undefined,
  teamId: string,
  body: TeamWriteInput,
  options?: { file?: File | null; clearPicture?: boolean },
) {
  const path = teamItemPath(hackathonId, teamId);
  const needsMultipart = Boolean(options?.file || options?.clearPicture);
  if (!needsMultipart) {
    return haasSend<EventTeam>(path, { method: "PATCH", body });
  }
  return haasSend<EventTeam>(path, {
    method: "PATCH",
    body: toFormData(body, {
      file: options?.file,
      flags: { clear_team_picture: options?.clearPicture },
    }),
  });
}

export async function setTeamActive(
  hackathonId: string | null | undefined,
  teamId: string,
  isActive: boolean,
) {
  return updateTeam(hackathonId, teamId, { is_active: isActive });
}

/** Re-provision K8s namespace + IP pool (deactivate then activate). */
export async function provisionTeamIpPool(
  hackathonId: string | null | undefined,
  teamId: string,
) {
  await setTeamActive(hackathonId, teamId, false);
  return setTeamActive(hackathonId, teamId, true);
}

export function teamHasIpPool(team: Pick<EventTeam, "ip_pool" | "pool_ip" | "subnet">) {
  return Boolean(team.ip_pool?.trim() || team.pool_ip?.trim() || team.subnet?.trim());
}

export function attachTeam(hackathonId: string, teamId: string) {
  return haasSend<unknown>(`hackathons/${hackathonId}/teams/attach`, {
    method: "POST",
    body: { team_id: teamId },
  });
}

/** Teams currently on the live playing roster for this event (= "Added"). */
export function listPlayingTeams(
  hackathonId: string,
  filters?: { search?: string; limit?: string },
) {
  return haasList<EventTeam>(`hackathons/${hackathonId}/playing/teams`, {
    search: filters?.search,
    limit: filters?.limit ?? "100",
  });
}

/** Detach team from this hackathon roster (keeps the team in the catalog). */
export function detachTeamFromHackathon(hackathonId: string, teamId: string) {
  return haasSend<unknown>(`hackathons/${hackathonId}/teams/${teamId}`, {
    method: "DELETE",
  });
}

/** Soft-delete / deactivate a team (platform or event-scoped path). */
export function removeTeam(
  hackathonId: string | null | undefined,
  teamId: string,
) {
  return haasSend<unknown>(teamItemPath(hackathonId, teamId), {
    method: "DELETE",
  });
}

export function blockTeam(hackathonId: string, teamId: string, reason: string) {
  return haasSend<unknown>(`hackathons/${hackathonId}/teams/${teamId}/block`, {
    method: "POST",
    body: { reason },
  });
}

export function unblockTeam(hackathonId: string, teamId: string) {
  return haasSend<unknown>(`hackathons/${hackathonId}/teams/${teamId}/unblock`, {
    method: "POST",
    body: {},
  });
}

export function approveTeamMember(
  hackathonId: string,
  teamId: string,
  membershipId: string,
  approved: boolean,
) {
  return haasSend<unknown>(
    `hackathons/${hackathonId}/teams/${teamId}/approve-members`,
    {
      method: "POST",
      body: { membership_id: membershipId, approved },
    },
  );
}

export function listTeamMembers(hackathonId: string, teamId: string) {
  return haasList<TeamMember>(
    `hackathons/${hackathonId}/teams/${teamId}/members`,
    { limit: "100" },
  );
}

export function addTeamMember(
  hackathonId: string,
  teamId: string,
  body: { user: string; is_captain?: boolean; is_approved?: boolean },
) {
  return haasSend<TeamMember>(
    `hackathons/${hackathonId}/teams/${teamId}/members`,
    { method: "POST", body },
  );
}

export function removeTeamMember(
  hackathonId: string,
  teamId: string,
  membershipId: string,
) {
  return haasSend<unknown>(
    `hackathons/${hackathonId}/teams/${teamId}/members/${membershipId}`,
    { method: "DELETE" },
  );
}

export function updateTeamMember(
  hackathonId: string,
  teamId: string,
  membershipId: string,
  body: {
    is_captain?: boolean;
    is_approved?: boolean;
    is_active?: boolean;
  },
) {
  return haasSend<TeamMember>(
    `hackathons/${hackathonId}/teams/${teamId}/members/${membershipId}`,
    { method: "PATCH", body },
  );
}
