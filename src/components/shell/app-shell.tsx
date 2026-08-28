"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { ApiTesterDrawer } from "@/components/shell/api-tester-drawer";
import { AppHeader } from "@/components/shell/app-header";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { ApiRequestError, callAppApi } from "@/lib/client-api";
import { isPlatformChallengeOperator } from "@/lib/is-platform-operator";
import { useUiPreferences } from "@/theme/ui-preferences";
import type { ApiResult } from "@/types";

type MePayload = {
  data: {
    user?: {
      email?: string;
      name?: string;
      last_name?: string;
      username?: string;
    };
    system_role?: string;
    is_root?: boolean;
  };
};

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const {
    navPlacement,
    sidebarCollapsed,
    mobileNavOpen,
    setMobileNavOpen,
  } = useUiPreferences();

  const [me, setMe] = useState<MePayload["data"] | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      try {
        const result = await callAppApi<ApiResult<MePayload>>("/api/haas/me");
        if (cancelled) return;
        if (result.ok) setMe(result.data.data);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiRequestError && error.httpStatus === 401) {
          router.replace("/login");
        }
      }
    }

    void loadMe();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await callAppApi("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  }, [router]);

  const isPlatformOperator = isPlatformChallengeOperator(me);
  const userLabel =
    me?.user?.email ||
    [me?.user?.name, me?.user?.last_name].filter(Boolean).join(" ") ||
    me?.user?.username ||
    "";

  const showSidebar = navPlacement === "sidebar";
  const sidebarWidth = sidebarCollapsed
    ? "var(--sidebar-collapsed-width)"
    : "var(--sidebar-width)";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <AppHeader
        isPlatformOperator={isPlatformOperator}
        userLabel={userLabel}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <div className="relative flex min-h-0 flex-1">
        {showSidebar ? (
          <aside
            className="hidden h-full shrink-0 overflow-y-auto border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] lg:block"
            style={{ width: sidebarWidth }}
          >
            <AppSidebar isPlatformOperator={isPlatformOperator} />
          </aside>
        ) : null}

        {/* Mobile drawer */}
        {mobileNavOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-30 bg-[var(--overlay)] lg:hidden"
              aria-label="Close menu"
              onClick={() => setMobileNavOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 z-40 w-[min(100vw,280px)] border-r border-[var(--border)] bg-[var(--surface)] pt-[var(--header-height)] lg:hidden">
              <AppSidebar
                isPlatformOperator={isPlatformOperator}
                forceExpanded
              />
            </aside>
          </>
        ) : null}

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      <ApiTesterDrawer />
    </div>
  );
}
