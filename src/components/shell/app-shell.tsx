"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";

import { ApiTesterDrawer } from "@/components/shell/api-tester-drawer";
import { AppHeader } from "@/components/shell/app-header";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import { callAppApi } from "@/lib/client-api";
import { useUiPreferences } from "@/theme/ui-preferences";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const {
    navPlacement,
    sidebarCollapsed,
    mobileNavOpen,
    setMobileNavOpen,
  } = useUiPreferences();
  const { isPlatformOperator, userDisplayName, userEmail } = useHaasAccess();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  const showSidebar = navPlacement === "sidebar";
  const sidebarWidth = sidebarCollapsed
    ? "var(--sidebar-collapsed-width)"
    : "var(--sidebar-width)";

  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--text)]">
      {showSidebar ? (
        <aside
          className="fixed inset-y-0 left-0 z-50 hidden overflow-y-auto border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] transition-[width] duration-300 lg:block"
          style={{ width: sidebarWidth }}
        >
          <AppSidebar
            isPlatformOperator={isPlatformOperator}
            userDisplayName={userDisplayName}
            userEmail={userEmail}
          />
        </aside>
      ) : null}

      {mobileNavOpen && showSidebar ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-[var(--overlay)] lg:hidden"
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[min(100vw,280px)] overflow-y-auto border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] lg:hidden">
            <AppSidebar
              isPlatformOperator={isPlatformOperator}
              forceExpanded
              userDisplayName={userDisplayName}
              userEmail={userEmail}
            />
          </aside>
        </>
      ) : null}

      <div
        className="flex min-h-dvh flex-col transition-[margin] duration-300"
        style={{ marginLeft: showSidebar ? sidebarWidth : 0 }}
      >
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-4 sm:px-6 lg:px-8">
          <AppHeader
            isPlatformOperator={isPlatformOperator}
            userDisplayName={userDisplayName}
            userEmail={userEmail}
            onLogout={handleLogout}
            isLoggingOut={isLoggingOut}
          />
          <main className="min-h-0 min-w-0 flex-1">{children}</main>
        </div>
      </div>

      <ApiTesterDrawer />
    </div>
  );
}
