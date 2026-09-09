import { haasGet, haasList, haasSend } from "@/lib/haas-api";
import type { UserBrief } from "@/types";

export type HackathonRoleCode =
  | "hackathon.manager"
  | "hackathon.moderator"
  | "hackathon.challenge_admin"
  | "hackathon.viewer"
  | "hackathon.organizer"
  | string;

export type HackathonRoleBinding = {
  id: string;
  user: string;
  hackathon?: string;
  hackathon_name?: string;
  role: HackathonRoleCode;
  role_label?: string;
  is_active?: boolean;
  granted_at?: string;
  revoked_at?: string | null;
  expires_at?: string | null;
  notes?: string;
  user_detail?: UserBrief;
};

export type HackathonRoleCatalogItem = {
  role: HackathonRoleCode;
  label: string;
  capabilities: string[];
  capability_labels?: { code: string; label: string }[];
};

export function listHackathonRoles(
  hackathonId: string,
  filters?: { role?: string; show_inactive?: string },
) {
  return haasList<HackathonRoleBinding>(`hackathons/${hackathonId}/roles`, {
    ...filters,
    limit: "100",
  });
}

export function getHackathonRoleCatalog(hackathonId: string) {
  return haasGet<HackathonRoleCatalogItem[]>(
    `hackathons/${hackathonId}/roles/catalog`,
  );
}

export function assignHackathonRole(
  hackathonId: string,
  body: {
    user: string;
    role: HackathonRoleCode;
    notes?: string;
    expires_at?: string | null;
  },
) {
  return haasSend<HackathonRoleBinding>(`hackathons/${hackathonId}/roles`, {
    method: "POST",
    body,
  });
}

export function updateHackathonRole(
  hackathonId: string,
  bindingId: string,
  body: Partial<{
    role: HackathonRoleCode;
    notes: string;
    expires_at: string | null;
  }>,
) {
  return haasSend<HackathonRoleBinding>(
    `hackathons/${hackathonId}/roles/${bindingId}`,
    { method: "PATCH", body },
  );
}

export function revokeHackathonRole(hackathonId: string, bindingId: string) {
  return haasSend<unknown>(`hackathons/${hackathonId}/roles/${bindingId}`, {
    method: "DELETE",
  });
}
