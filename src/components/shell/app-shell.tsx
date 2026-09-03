"use client";

import { useCallback, useState, type ReactNode } from "react";

import { ApiTesterDrawer } from "@/components/shell/api-tester-drawer";
import { AppHeader } from "@/components/shell/app-header";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { SelectWorkspaceProvider } from "@/features/events/select-workspace-modal";
import { useLogout } from "@/features/auth/use-logout";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import { useIsLgUp } from "@/lib/use-media-query";
import { useUiPreferences } from "@/theme/ui-preferences";

export function AppShell({ children }: { children: ReactNode }) {
  const {
    navPlacement,
    mobileNavOpen,
    setMobileNavOpen,
  } = useUiPreferences();
  const { isPlatformOperator, isEventOnlyAdmin, userDisplayName, userEmail } = useHaasAccess();
  const { logout, isLoggingOut } = useLogout();

  const handleLogout = useCallback(() => {
    void logout();
  }, [logout]);

  const showSidebar = navPlacement === "sidebar";
  const isLgUp = useIsLgUp();
  const sidebarVisible = showSidebar && isLgUp;
  const mainMarginLeft = sidebarVisible ? "var(--sidebar-width)" : 0;

  return (
    <SelectWorkspaceProvider>
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--text)]">
      {sidebarVisible ? (
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-[var(--sidebar-width)] overflow-hidden border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] lg:flex lg:flex-col">
          <AppSidebar
            isPlatformOperator={isPlatformOperator}
            isEventOnlyAdmin={isEventOnlyAdmin}
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
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[min(100vw,280px)] flex-col overflow-hidden border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] lg:hidden">
            <AppSidebar
              isPlatformOperator={isPlatformOperator}
              isEventOnlyAdmin={isEventOnlyAdmin}
            />
          </aside>
        </>
      ) : null}

      <div
        className="flex min-h-dvh flex-col transition-[margin] duration-300"
        style={{ marginLeft: mainMarginLeft }}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden px-3 pb-4 pt-0 sm:px-6 lg:px-8">
          <AppHeader
            isPlatformOperator={isPlatformOperator}
            isEventOnlyAdmin={isEventOnlyAdmin}
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
    </SelectWorkspaceProvider>
  );
}
