"use client";

import { useCallback, useState } from "react";

import { useHaasAccess } from "@/features/auth/haas-access-context";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { callAppApi } from "@/lib/client-api";
import { clearClientSessionStorage, hardReloadApplication } from "@/lib/client-session";

/**
 * Log out: clear cookie, wipe session storage, reset auth contexts, hard-reload the app.
 */
export function useLogout() {
  const { clearSession: clearAccessSession } = useHaasAccess();
  const { clearSession: clearSelectedEventSession } = useSelectedEvent();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await callAppApi("/api/auth/logout", { method: "POST" });
    } catch {
      // Still clear client state if the network call fails (cookie may already be gone).
    } finally {
      clearClientSessionStorage();
      clearAccessSession();
      clearSelectedEventSession();
      hardReloadApplication("/login");
    }
  }, [clearAccessSession, clearSelectedEventSession]);

  return { logout, isLoggingOut };
}
