import {
  haasGet,
  haasList,
  haasListAll,
  haasSend,
  toFormData,
} from "@/lib/haas-api";
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

export type TeamNetworkPolicyStatus = "applied" | "failed" | "not_applied";

export type TeamNetworkPolicy = {
  status: TeamNetworkPolicyStatus;
  last_error?: string;
  policy_name?: string;
  applied_at?: string | null;
  /** Team has a namespace + IP pool, so a policy can be applied */
  can_apply?: boolean;
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
  /** actual | testing | load_testing — hidden from public boards when event setting is off */
  team_type?: string | null;
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
  /** Catalog events this team is created-for (NOT the live playing roster). */
  created_for?: { id: string; name?: string; display_name?: string }[];
  /** Hackathons whose live roster includes this team */
  playing_in?: { id: string; name?: string; display_name?: string }[];
  referer?: string | null;
  referer_detail?: {
    id: string;
    name?: string;
    slug?: string;
    description?: string;
    is_active?: boolean;
  } | null;
  /** Calico network policy status (same as Django Teams admin) */
  network_policy?: TeamNetworkPolicy | null;
  created_at?: string | null;
};

export type TeamListFilters = {
  search?: string;
  status?: string;
  register_as?: string;
  is_active?: string;
  is_blocked?: string;
  hackathon?: string;
  /** Referer id, slug, or "none". */
  referer?: string;
  limit?: string;
};

export type TeamWriteInput = {
  name?: string;
  description?: string;
  register_as?: string;
  team_type?: string;
  affiliation?: string;
  website?: string;
  is_active?: boolean;
  /** Legacy single event (prefer hackathon_ids). */
  hackathon?: string | null;
  /** Events this team is created for / linked to (system /teams, multi). */
  hackathon_ids?: string[];
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
    referer: filters?.referer,
    limit: filters?.limit ?? "100",
  });
}

/** Every team on the platform (all pages). Optional `hackathon` narrows to one event. */
export function listPlatformTeams(filters?: Omit<TeamListFilters, "limit">) {
  return haasListAll<EventTeam>("teams", {
    search: filters?.search,
    status: filters?.status,
    register_as: filters?.register_as,
    is_active: filters?.is_active,
    is_blocked: filters?.is_blocked,
    hackathon: filters?.hackathon,
    referer: filters?.referer,
  });
}

export function listTeams(hackathonId: string, filters?: TeamListFilters) {
  return haasList<EventTeam>(`hackathons/${hackathonId}/teams`, {
    search: filters?.search,
    status: filters?.status,
    register_as: filters?.register_as,
    is_active: filters?.is_active,
    is_blocked: filters?.is_blocked,
    referer: filters?.referer,
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
    team_type?: string;
    affiliation?: string;
    /** When creating from system /teams, link to one or many events. */
    hackathon?: string | null;
    hackathon_ids?: string[];
  },
  options?: { file?: File | null },
) {
  const path = teamCollectionPath(hackathonId);
  const payload: Record<string, unknown> = {
    name: body.name,
    description: body.description,
    register_as: body.register_as,
    team_type: body.team_type,
    affiliation: body.affiliation,
  };
  if (hackathonId) {
    payload.hackathon = hackathonId;
  } else if (body.hackathon_ids) {
    payload.hackathon_ids = body.hackathon_ids;
  } else if (body.hackathon) {
    payload.hackathon = body.hackathon;
  }
  if (!options?.file) {
    return haasSend<EventTeam>(path, { method: "POST", body: payload });
  }
  return haasSend<EventTeam>(path, {
    method: "POST",
    body: toFormData(payload, { file: options.file }),
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

/** All pages of the live playing team roster. */
export function listAllPlayingTeams(
  hackathonId: string,
  filters?: { search?: string },
) {
  return haasListAll<EventTeam>(`hackathons/${hackathonId}/playing/teams`, {
    search: filters?.search,
  });
}

/** Add teams to the live playing roster. */
export function addPlayingTeams(hackathonId: string, teamIds: string[]) {
  return haasSend<unknown>(`hackathons/${hackathonId}/playing/teams`, {
    method: "POST",
    body: { team_ids: teamIds },
  });
}

/** Remove one team from the live playing roster. */
export function removePlayingTeam(hackathonId: string, teamId: string) {
  return haasSend<unknown>(
    `hackathons/${hackathonId}/playing/teams/${teamId}`,
    { method: "DELETE" },
  );
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

/** Platform-level block (no hackathon scope in the URL). */
export function blockPlatformTeam(teamId: string, reason: string) {
  return haasSend<unknown>(`teams/${teamId}/block`, {
    method: "POST",
    body: { reason },
  });
}

export function unblockPlatformTeam(teamId: string) {
  return haasSend<unknown>(`teams/${teamId}/unblock`, {
    method: "POST",
    body: {},
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

/** Apply the team's Calico network policy (platform path when hackathonId is null). */
export function applyTeamNetworkPolicy(
  hackathonId: string | null | undefined,
  teamId: string,
) {
  return haasSend<{ id: string; network_policy: TeamNetworkPolicy }>(
    `${teamItemPath(hackathonId, teamId)}/network-policy/apply`,
    { method: "POST", body: {} },
  );
}

/** Delete the team's Calico network policy. */
export function deleteTeamNetworkPolicy(
  hackathonId: string | null | undefined,
  teamId: string,
) {
  return haasSend<{ id: string; network_policy: TeamNetworkPolicy }>(
    `${teamItemPath(hackathonId, teamId)}/network-policy/delete`,
    { method: "POST", body: {} },
  );
}

/**
 * Apply the network policy, provisioning the namespace + IP pool first when the
 * team has none yet (policy needs both). Waits briefly for provisioning to land.
 */
export async function applyTeamNetworkPolicyEnsuringPool(
  hackathonId: string | null | undefined,
  team: Pick<EventTeam, "id" | "name" | "name_code" | "pool_ip" | "is_blocked" | "network_policy">,
) {
  const hasPool =
    team.network_policy?.can_apply ?? Boolean(team.name_code && team.pool_ip);
  if (!hasPool) {
    if (team.is_blocked) {
      throw new Error(`Unblock "${team.name}" before applying a network policy.`);
    }
    await provisionTeamIpPool(hackathonId, team.id);
    let ready = false;
    for (let attempt = 0; attempt < 8 && !ready; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const fresh = await getTeam(hackathonId, team.id);
      ready = Boolean(fresh.name_code && fresh.pool_ip);
    }
    if (!ready) {
      throw new Error(
        `IP pool for "${team.name}" is still provisioning — click Apply again in a moment.`,
      );
    }
  }
  return applyTeamNetworkPolicy(hackathonId, team.id);
}
