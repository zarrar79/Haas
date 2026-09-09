import { haasList, haasSend } from "@/lib/haas-api";
import type { UserBrief } from "@/types";

export type HackathonAdminBinding = {
  id: string;
  user: string;
  hackathon: string;
  is_active?: boolean;
  granted_at?: string;
  revoked_at?: string | null;
  notes?: string;
  user_detail?: UserBrief;
  hackathon_detail?: {
    id?: string;
    name?: string;
  };
};

export function listHackathonAdmins(filters?: {
  hackathon?: string;
  user?: string;
  is_active?: string;
  show_inactive?: string;
}) {
  return haasList<HackathonAdminBinding>("hackathon-admins", {
    ...filters,
    limit: "100",
  });
}

export function assignHackathonAdmin(body: {
  user: string;
  hackathon: string;
  notes?: string;
}) {
  return haasSend<HackathonAdminBinding>("hackathon-admins", {
    method: "POST",
    body,
  });
}

export function revokeHackathonAdmin(bindingId: string) {
  return haasSend<unknown>(`hackathon-admins/${bindingId}`, {
    method: "DELETE",
  });
}

/** Apply desired admin user ids; assigns new and revokes removed bindings. */
export async function syncHackathonAdmins(
  hackathonId: string,
  desiredUserIds: string[],
  existingBindings: HackathonAdminBinding[],
) {
  const desired = new Set(desiredUserIds.filter(Boolean));
  const existingByUser = new Map(existingBindings.map((b) => [b.user, b]));

  const toAssign = [...desired].filter((id) => {
    const existing = existingByUser.get(id);
    return !existing || existing.is_active === false;
  });
  const toRevoke = existingBindings.filter(
    (b) => b.is_active !== false && !desired.has(b.user),
  );

  await Promise.all([
    ...toAssign.map((userId) =>
      assignHackathonAdmin({ user: userId, hackathon: hackathonId }),
    ),
    ...toRevoke.map((binding) => revokeHackathonAdmin(binding.id)),
  ]);
}
