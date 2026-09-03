import type { HaasMePayload } from "@/lib/haas-access";
import { isPlatformOperator } from "@/lib/haas-access";

export type AssignedHackathon = {
  hackathon_id: string;
  hackathon_name: string;
  granted_at?: string;
};

export function getAssignedHackathons(
  me: HaasMePayload | null | undefined,
): AssignedHackathon[] {
  return me?.hackathon_admins ?? [];
}

export function isAssignedToHackathon(
  me: HaasMePayload | null | undefined,
  hackathonId: string | null | undefined,
): boolean {
  if (!me || !hackathonId) return false;
  return getAssignedHackathons(me).some((row) => row.hackathon_id === hackathonId);
}

/** Hackathon admin only — not Root / system operator. */
export function isEventOnlyAdmin(me: HaasMePayload | null | undefined): boolean {
  if (!me || isPlatformOperator(me)) return false;
  return getAssignedHackathons(me).length > 0;
}

export function resolveAssignedEventId(
  me: HaasMePayload | null | undefined,
  selectedId: string | null,
): string | null {
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
  if (!user) return "—";
  const full = [user.name, user.last_name].filter(Boolean).join(" ");
  return full || user.username || user.email || user.id || "—";
}
