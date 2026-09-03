"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  canMutateEvent,
  hasCapability,
  isEventAdmin,
  isEventOnlyAdmin,
  isHigherStaffUser,
  isPlatformOperator,
  isRootUser,
  userDisplayName,
  type HaasMePayload,
} from "@/lib/haas-access";
import type { HaasCapabilityName } from "@/lib/haas-capabilities";
import { ApiRequestError, callAppApi } from "@/lib/client-api";
import { clearClientSessionStorage } from "@/lib/client-session";
import type { ApiResult } from "@/types";

type HaasAccessContextValue = {
  me: HaasMePayload | null;
  isLoading: boolean;
  refreshMe: () => Promise<void>;
  clearSession: () => void;
  isRoot: boolean;
  isHigherStaff: boolean;
  isPlatformOperator: boolean;
  isEventOnlyAdmin: boolean;
  isEventAdmin: (hackathonId: string | null | undefined) => boolean;
  canMutateEvent: (hackathonId: string | null | undefined) => boolean;
  hasCapability: (
    capability: HaasCapabilityName | string,
    hackathonId?: string | null,
  ) => boolean;
  userDisplayName: string;
  userEmail: string;
};

const HaasAccessContext = createContext<HaasAccessContextValue | null>(null);

export function HaasAccessProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<HaasMePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const skipPathRefresh = useRef(true);

  const refreshMe = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await callAppApi<ApiResult<{ data: HaasMePayload }>>(
        "/api/haas/me",
      );
      if (result.ok) {
        setMe(result.data.data);
      }
    } catch (error) {
      if (error instanceof ApiRequestError && error.httpStatus === 401) {
        clearClientSessionStorage();
        setMe(null);
        router.replace("/login");
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const clearSession = useCallback(() => {
    setMe(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  // Soft navigation after login does not remount this provider — refetch /me.
  useEffect(() => {
    if (skipPathRefresh.current) {
      skipPathRefresh.current = false;
      return;
    }
    if (pathname !== "/login") {
      void refreshMe();
    }
  }, [pathname, refreshMe]);

  const value = useMemo<HaasAccessContextValue>(
    () => ({
      me,
      isLoading,
      refreshMe,
      clearSession,
      isRoot: isRootUser(me),
      isHigherStaff: isHigherStaffUser(me),
      isPlatformOperator: isPlatformOperator(me),
      isEventOnlyAdmin: isEventOnlyAdmin(me),
      isEventAdmin: (hackathonId) => isEventAdmin(me, hackathonId),
      canMutateEvent: (hackathonId) => canMutateEvent(me, hackathonId),
      hasCapability: (capability, hackathonId) =>
        hasCapability(me, capability, hackathonId),
      userDisplayName: userDisplayName(me?.user),
      userEmail: me?.user?.email || "",
    }),
    [me, isLoading, refreshMe, clearSession],
  );

  return (
    <HaasAccessContext.Provider value={value}>
      {children}
    </HaasAccessContext.Provider>
  );
}

export function useHaasAccess() {
  const ctx = useContext(HaasAccessContext);
  if (!ctx) {
    throw new Error("useHaasAccess must be used within HaasAccessProvider");
  }
  return ctx;
}
