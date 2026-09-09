import { formatPersonName } from "@/lib/display-name";
import type { HaasCapabilityName } from "@/lib/haas-capabilities";

export const HIGHER_STAFF_GROUP_NAME = "HigherStaff";

export type HaasMeUser = {
  id?: string;
  username?: string;
  email?: string;
  name?: string;
  last_name?: string;
  user_type?: string;
  is_block?: boolean;
};

export type HaasHackathonAdminBinding = {
  hackathon_id: string;
  hackathon_name: string;
  granted_at?: string;
};

/** Legacy shape still returned by some clients — normalized in context. */
export type HaasHackathonRoleBinding = {
  hackathon_id: string;
  hackathon_name: string;
  role?: string;
  expires_at?: string | null;
};

export type HaasMePayload = {
  user?: HaasMeUser;
  system_role?: string;
  is_root?: boolean;
  is_higher_staff?: boolean;
  groups?: string[];
  permissions?: string[];
  hackathon_admins?: HaasHackathonAdminBinding[];
  hackathon_roles?: HaasHackathonRoleBinding[];
};

export function isRootUser(me: HaasMePayload | null | undefined): boolean {
  return Boolean(me?.is_root);
}

export function isHigherStaffUser(
  me: HaasMePayload | null | undefined,
): boolean {
  if (!me) return false;
  if (me.is_higher_staff === true) return true;
  return me.groups?.includes(HIGHER_STAFF_GROUP_NAME) ?? false;
}

export function isPlatformOperator(
  me: HaasMePayload | null | undefined,
): boolean {
  if (!me) return false;
  if (me.is_root) return true;
  if (isHigherStaffUser(me)) return true;
  const role = (me.system_role ?? "").trim();
  return role === "system.root" || role === "system.admin";
}

export function isEventAdmin(
  me: HaasMePayload | null | undefined,
  hackathonId: string | null | undefined,
): boolean {
  if (!me || !hackathonId) return false;
  if (isRootUser(me) || isHigherStaffUser(me)) return true;
  if (
    me.hackathon_admins?.some((row) => row.hackathon_id === hackathonId)
  ) {
    return true;
  }
  return (
    me.hackathon_roles?.some(
      (row) =>
        row.hackathon_id === hackathonId &&
        row.role &&
        row.role !== "hackathon.viewer",
    ) ?? false
  );
}

/** True when the user may mutate event resources they have write caps for. */
export function canMutateEvent(
  me: HaasMePayload | null | undefined,
  hackathonId: string | null | undefined,
): boolean {
  return isEventAdmin(me, hackathonId);
}

export function hasCapability(
  me: HaasMePayload | null | undefined,
  capability: HaasCapabilityName | string,
  hackathonId?: string | null,
): boolean {
  if (!me) return false;
  if (me.is_root || me.permissions?.includes("*")) return true;
  if (isHigherStaffUser(me)) return true;
  // Platform /me permissions are the union across events; prefer exact match.
  if (me.permissions?.includes(capability)) {
    // If scoped to an event, also require membership on that event.
    if (!hackathonId) return true;
    return isEventAdmin(me, hackathonId) || Boolean(
      me.hackathon_admins?.some((r) => r.hackathon_id === hackathonId) ||
        me.hackathon_roles?.some((r) => r.hackathon_id === hackathonId),
    );
  }
  return false;
}

export { isEventOnlyAdmin } from "@/lib/assigned-events";

export function userDisplayName(user?: HaasMeUser | null): string {
  return formatPersonName(user);
}
