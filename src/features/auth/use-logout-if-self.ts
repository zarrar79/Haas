"use client";

import { useCallback } from "react";

import { useHaasAccess } from "@/features/auth/haas-access-context";
import { useLogout } from "@/features/auth/use-logout";

/**
 * Logs out when the affected user is the signed-in user (e.g. self-deactivation).
 * Returns true when logout was triggered.
 */
export function useLogoutIfSelf() {
  const { me } = useHaasAccess();
  const { logout } = useLogout();

  return useCallback(
    async (affectedUserId: string): Promise<boolean> => {
      const currentId = me?.user?.id;
      if (!currentId || String(currentId) !== String(affectedUserId)) {
        return false;
      }
      await logout();
      return true;
    },
    [me?.user?.id, logout],
  );
}
