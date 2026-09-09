import { haasList, haasSend } from "@/lib/haas-api";

export type HaasPermission = {
  id: number;
  codename?: string;
  name?: string;
};

export type HaasGroup = {
  id: string | number;
  name: string;
  description?: string;
  hackathon?: string | null;
  can_manage_groups?: boolean;
  user_count?: number;
  permissions?: HaasPermission[];
  users?: Array<{ id: string; username?: string }>;
};

export function listPermissions() {
  return haasList<HaasPermission>("permissions", { limit: "200" });
}

export function listPlatformGroups() {
  return haasList<HaasGroup>("groups", { limit: "100" });
}

export function listEventGroups(hackathonId: string) {
  return haasList<HaasGroup>(`hackathons/${hackathonId}/groups`, {
    limit: "100",
  });
}

export function createEventGroup(
  hackathonId: string,
  body: {
    name: string;
    description?: string;
    can_manage_groups?: boolean;
    permission_ids?: number[];
    user_ids?: string[];
  },
) {
  return haasSend<HaasGroup>(`hackathons/${hackathonId}/groups`, {
    method: "POST",
    body: { ...body, hackathon: hackathonId },
  });
}

export function createPlatformGroup(body: {
  name: string;
  description?: string;
  permission_ids?: number[];
}) {
  return haasSend<HaasGroup>("groups", { method: "POST", body });
}

export function assignGroupUsers(
  groupId: string | number,
  body: { user_ids: string[]; remove?: boolean },
  hackathonId?: string,
) {
  const path = hackathonId
    ? `hackathons/${hackathonId}/groups/${groupId}/assign-users`
    : `groups/${groupId}/assign-users`;
  return haasSend<unknown>(path, { method: "POST", body });
}
