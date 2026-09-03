import { callAppApi } from "@/lib/client-api";
import {
  asList,
  haasApiPath,
  unwrapHaasResult,
  type HaasForwardPayload,
} from "@/lib/haas-api";
import type { ApiResult } from "@/types";

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
  user_detail?: {
    id?: string;
    username?: string;
    email?: string;
    name?: string;
    last_name?: string;
    media_url?: string | null;
  };
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

export async function listAllTeams(filters?: TeamListFilters) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath("teams", {
      search: filters?.search,
      status: filters?.status,
      register_as: filters?.register_as,
      is_active: filters?.is_active,
      is_blocked: filters?.is_blocked,
      hackathon: filters?.hackathon,
      limit: filters?.limit ?? "100",
    }),
  );
  return asList<EventTeam>(unwrapHaasResult(result).data);
}

export async function listTeams(
  hackathonId: string,
  filters?: TeamListFilters,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/teams`, {
      search: filters?.search,
      status: filters?.status,
      register_as: filters?.register_as,
      is_active: filters?.is_active,
      is_blocked: filters?.is_blocked,
      limit: filters?.limit ?? "100",
    }),
  );
  return asList<EventTeam>(unwrapHaasResult(result).data);
}

export async function getTeam(hackathonId: string | null | undefined, teamId: string) {
  const path = hackathonId
    ? haasApiPath(`hackathons/${hackathonId}/teams/${teamId}`)
    : haasApiPath(`teams/${teamId}`);
  const result = await callAppApi<ApiResult<HaasForwardPayload<EventTeam>>>(path);
  return unwrapHaasResult(result).data;
}

export async function createTeam(
  hackathonId: string | null | undefined,
  body: {
    name: string;
    description?: string;
    register_as?: string;
    affiliation?: string;
  },
  options?: { file?: File | null },
) {
  const path = hackathonId
    ? haasApiPath(`hackathons/${hackathonId}/teams`)
    : haasApiPath("teams");

  if (!options?.file) {
    const result = await callAppApi<ApiResult<HaasForwardPayload<EventTeam>>>(
      path,
      { method: "POST", body },
    );
    return unwrapHaasResult(result).data;
  }

  const form = new FormData();
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue;
    form.append(key, String(value));
  }
  form.append("file", options.file);

  const result = await callAppApi<ApiResult<HaasForwardPayload<EventTeam>>>(
    path,
    { method: "POST", body: form },
  );
  return unwrapHaasResult(result).data;
}

export async function updateTeam(
  hackathonId: string | null | undefined,
  teamId: string,
  body: TeamWriteInput,
  options?: { file?: File | null; clearPicture?: boolean },
) {
  const path = hackathonId
    ? haasApiPath(`hackathons/${hackathonId}/teams/${teamId}`)
    : haasApiPath(`teams/${teamId}`);

  const needsMultipart = Boolean(options?.file || options?.clearPicture);
  if (!needsMultipart) {
    const result = await callAppApi<ApiResult<HaasForwardPayload<EventTeam>>>(
      path,
      { method: "PATCH", body },
    );
    return unwrapHaasResult(result).data;
  }

  const form = new FormData();
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue;
    form.append(key, String(value));
  }
  if (options?.file) form.append("file", options.file);
  if (options?.clearPicture) form.append("clear_team_picture", "true");

  const result = await callAppApi<ApiResult<HaasForwardPayload<EventTeam>>>(
    path,
    { method: "PATCH", body: form },
  );
  return unwrapHaasResult(result).data;
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

export async function attachTeam(hackathonId: string, teamId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/teams/attach`),
    { method: "POST", body: { team_id: teamId } },
  );
  return unwrapHaasResult(result);
}

/** Teams currently on the live playing roster for this event (= "Added"). */
export async function listPlayingTeams(
  hackathonId: string,
  filters?: { search?: string; limit?: string },
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/playing/teams`, {
      search: filters?.search,
      limit: filters?.limit ?? "100",
    }),
  );
  return asList<EventTeam>(unwrapHaasResult(result).data);
}

/** Detach team from this hackathon roster (keeps the team in the catalog). */
export async function detachTeamFromHackathon(
  hackathonId: string,
  teamId: string,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/teams/${teamId}`),
    { method: "DELETE" },
  );
  return unwrapHaasResult(result);
}

/** Soft-delete / deactivate a team (platform or event-scoped path). */
export async function removeTeam(
  hackathonId: string | null | undefined,
  teamId: string,
) {
  const path = hackathonId
    ? haasApiPath(`hackathons/${hackathonId}/teams/${teamId}`)
    : haasApiPath(`teams/${teamId}`);
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(path, {
    method: "DELETE",
  });
  return unwrapHaasResult(result);
}

export async function blockTeam(
  hackathonId: string,
  teamId: string,
  reason: string,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/teams/${teamId}/block`),
    { method: "POST", body: { reason } },
  );
  return unwrapHaasResult(result);
}

export async function unblockTeam(hackathonId: string, teamId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/teams/${teamId}/unblock`),
    { method: "POST", body: {} },
  );
  return unwrapHaasResult(result);
}

export async function approveTeamMember(
  hackathonId: string,
  teamId: string,
  membershipId: string,
  approved: boolean,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/teams/${teamId}/approve-members`),
    {
      method: "POST",
      body: { membership_id: membershipId, approved },
    },
  );
  return unwrapHaasResult(result);
}

export async function listTeamMembers(hackathonId: string, teamId: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`hackathons/${hackathonId}/teams/${teamId}/members`, {
      limit: "100",
    }),
  );
  return asList<TeamMember>(unwrapHaasResult(result).data);
}

export async function addTeamMember(
  hackathonId: string,
  teamId: string,
  body: { user: string; is_captain?: boolean; is_approved?: boolean },
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<TeamMember>>>(
    haasApiPath(`hackathons/${hackathonId}/teams/${teamId}/members`),
    { method: "POST", body },
  );
  return unwrapHaasResult(result).data;
}

export async function removeTeamMember(
  hackathonId: string,
  teamId: string,
  membershipId: string,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(
      `hackathons/${hackathonId}/teams/${teamId}/members/${membershipId}`,
    ),
    { method: "DELETE" },
  );
  return unwrapHaasResult(result);
}

export async function updateTeamMember(
  hackathonId: string,
  teamId: string,
  membershipId: string,
  body: {
    is_captain?: boolean;
    is_approved?: boolean;
    is_active?: boolean;
  },
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<TeamMember>>>(
    haasApiPath(
      `hackathons/${hackathonId}/teams/${teamId}/members/${membershipId}`,
    ),
    { method: "PATCH", body },
  );
  return unwrapHaasResult(result).data;
}
