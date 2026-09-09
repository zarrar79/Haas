import { userLabel } from "@/lib/assigned-events";
import type { SystemUser } from "@/features/system/system-api";

export type UserCreatorDetail = NonNullable<SystemUser["created_by_detail"]>;

function staffActor(detail?: UserCreatorDetail | null): boolean {
  if (!detail) return false;
  if (detail.is_superuser || detail.is_staff) return true;
  if (detail.is_platform_admin) return true;
  return detail.user_type === "Admin";
}

/** Account was created or last updated by a staff / Root user. */
export function isStaffProvisionedUser(user: SystemUser): boolean {
  if (user.created_by || user.created_by_detail?.id) {
    if (!user.created_by_detail) return true;
    if (staffActor(user.created_by_detail)) return true;
  }
  if (user.updated_by_detail?.id && staffActor(user.updated_by_detail)) {
    return true;
  }
  return false;
}

/** @deprecated Prefer isStaffProvisionedUser */
export function hasStaffCreator(user: SystemUser): boolean {
  return isStaffProvisionedUser(user);
}

export function filterStaffProvisionedUsers(users: SystemUser[]): SystemUser[] {
  return users.filter(isStaffProvisionedUser);
}

export function creatorIsAdmin(detail?: UserCreatorDetail | null): boolean {
  return staffActor(detail);
}

export function staffCreatorLabel(user: SystemUser): string | null {
  const detail = user.created_by_detail || user.updated_by_detail;
  if (!detail || !staffActor(detail)) return null;
  const actor = userLabel(detail);
  const role = creatorIsAdmin(detail) ? "Admin" : detail.user_type || "Staff";
  const verb = user.created_by_detail ? "Created by" : "Updated by";
  return `${verb}: ${actor} (${role})`;
}

export function staffCreatorBadge(user: SystemUser): "Admin" | "Staff" | null {
  if (!isStaffProvisionedUser(user)) return null;
  const detail = user.created_by_detail || user.updated_by_detail;
  return creatorIsAdmin(detail) ? "Admin" : "Staff";
}
