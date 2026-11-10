import { formatPersonName } from "@/lib/display-name";
import type { HaasMePayload } from "@/lib/haas-access";
import { isPlatformOperator } from "@/lib/haas-access";

export type AssignedHackathon = {
  hackathon_id: string;
  hackathon_name: string;
  granted_at?: string;
  role?: string;
};

export function getAssignedHackathons(
  me: HaasMePayload | null | undefined,
): AssignedHackathon[] {
  const byId = new Map<string, AssignedHackathon>();
  for (const row of me?.hackathon_admins ?? []) {
    byId.set(row.hackathon_id, {
      hackathon_id: row.hackathon_id,
      hackathon_name: row.hackathon_name,
      granted_at: row.granted_at,
      role: "hackathon.organizer",
    });
  }
  for (const row of me?.hackathon_roles ?? []) {
    if (!byId.has(row.hackathon_id)) {
      byId.set(row.hackathon_id, {
        hackathon_id: row.hackathon_id,
        hackathon_name: row.hackathon_name,
        role: row.role,
      });
    }
  }
  return [...byId.values()];
}

export function isAssignedToHackathon(
  me: HaasMePayload | null | undefined,
  hackathonId: string | null | undefined,
): boolean {
  if (!me || !hackathonId) return false;
  return getAssignedHackathons(me).some((row) => row.hackathon_id === hackathonId);
}

/** Hackathon admin / scoped staff only — not Root / system operator. */
export function isEventOnlyAdmin(me: HaasMePayload | null | undefined): boolean {
  if (!me || isPlatformOperator(me)) return false;
  return getAssignedHackathons(me).length > 0;
}

export function resolveAssignedEventId(
  me: HaasMePayload | null | undefined,
  selectedId: string | null,
): string | null {
  // Root / HigherStaff / system.admin may open any event from the navbar —
  // do not clamp to /me.hackathon_admins (that list is often partial or empty).
  if (isPlatformOperator(me)) {
    return selectedId;
  }
  const assigned = getAssignedHackathons(me);
  if (assigned.length === 0) return null;
  if (selectedId && assigned.some((row) => row.hackathon_id === selectedId)) {
    return selectedId;
  }
  return assigned[0]?.hackathon_id ?? null;
}

export function userLabel(user?: {
  name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  id?: string;
}) {
  return formatPersonName(user, user?.id || "—");
}
