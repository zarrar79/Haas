"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  canMutateEvent,
  hasCapability,
  isEventAdmin,
  isPlatformOperator,
  isRootUser,
  userDisplayName,
  type HaasMePayload,
} from "@/lib/haas-access";
import type { HaasCapabilityName } from "@/lib/haas-capabilities";
import { ApiRequestError, callAppApi } from "@/lib/client-api";
import type { ApiResult } from "@/types";

type HaasAccessContextValue = {
  me: HaasMePayload | null;
  isLoading: boolean;
  refreshMe: () => Promise<void>;
  isRoot: boolean;
  isPlatformOperator: boolean;
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
  const [me, setMe] = useState<HaasMePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        router.replace("/login");
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const value = useMemo<HaasAccessContextValue>(
    () => ({
      me,
      isLoading,
      refreshMe,
      isRoot: isRootUser(me),
      isPlatformOperator: isPlatformOperator(me),
      isEventAdmin: (hackathonId) => isEventAdmin(me, hackathonId),
      canMutateEvent: (hackathonId) => canMutateEvent(me, hackathonId),
      hasCapability: (capability, hackathonId) =>
        hasCapability(me, capability, hackathonId),
      userDisplayName: userDisplayName(me?.user),
      userEmail: me?.user?.email || "",
    }),
    [me, isLoading, refreshMe],
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
