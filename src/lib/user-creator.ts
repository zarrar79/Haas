import { userLabel } from "@/lib/assigned-events";
import type { SystemUser } from "@/features/system/system-api";

export type UserCreatorDetail = NonNullable<SystemUser["created_by_detail"]>;

export function hasStaffCreator(user: SystemUser): boolean {
  return Boolean(user.created_by || user.created_by_detail?.id);
}

/** Users provisioned by staff (created_by is set on the account). */
export function filterStaffProvisionedUsers(users: SystemUser[]): SystemUser[] {
  return users.filter(hasStaffCreator);
}

export function creatorIsAdmin(detail?: UserCreatorDetail | null): boolean {
  if (!detail) return false;
  if (detail.is_superuser || detail.is_staff) return true;
  if (detail.is_platform_admin) return true;
  return detail.user_type === "Admin";
}

export function staffCreatorLabel(user: SystemUser): string | null {
  if (!hasStaffCreator(user)) return null;
  const detail = user.created_by_detail;
  if (!detail) return null;
  const creator = userLabel(detail);
  const role = creatorIsAdmin(detail) ? "Admin" : detail.user_type || "Staff";
  return `${creator} (${role})`;
}

export function staffCreatorBadge(user: SystemUser): "Admin" | "Staff" | null {
  if (!hasStaffCreator(user)) return null;
  return creatorIsAdmin(user.created_by_detail) ? "Admin" : "Staff";
}
