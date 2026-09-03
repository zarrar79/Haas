"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BiBarChartAlt2,
  BiChevronsLeft,
  BiFullscreen,
  BiLogOut,
  BiMenu,
  BiMenuAltLeft,
  BiMoon,
  BiSun,
} from "react-icons/bi";

import { Button } from "@/components/ui/button";
import { AppBrandMark } from "@/components/shell/app-brand-mark";
import { GlobalSearchBar } from "@/components/shell/global-search-bar";
import { HeaderEventPicker } from "@/components/shell/header-event-picker";
import { HeaderMobileNav } from "@/components/shell/header-mobile-nav";
import { HeaderNavMenu } from "@/components/shell/header-nav-menu";
import { NotificationsPanel } from "@/components/shell/notifications-panel";
import { useTheme } from "@/theme/theme-provider";
import { useUiPreferences } from "@/theme/ui-preferences";

type AppHeaderProps = {
  isPlatformOperator?: boolean;
  isEventOnlyAdmin?: boolean;
  userDisplayName?: string;
  userEmail?: string;
  onLogout?: () => void;
  isLoggingOut?: boolean;
};

const HEADER_ICON_BTN =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--input-bg)] text-[var(--text)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--surface-hover)] sm:size-[42px]";

const LIVE_DASHBOARD_URL =
  process.env.NEXT_PUBLIC_LIVE_DASHBOARD_URL?.replace(/\/$/, "") ?? "";

export function AppHeader({
  isPlatformOperator = false,
  isEventOnlyAdmin = false,
  userDisplayName,
  userEmail,
  onLogout,
  isLoggingOut,
}: AppHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const {
    navPlacement,
    toggleNavPlacement,
    setMobileNavOpen,
    mobileNavOpen,
  } = useUiPreferences();

  const [headerMobileOpen, setHeaderMobileOpen] = useState(false);
  const headerNavMode = navPlacement === "header";
  const userInitial = userDisplayName
    ? userDisplayName.trim().charAt(0).toUpperCase()
    : "?";

  return (
    <header className="relative sticky top-0 z-40 -mx-3 mb-3 flex shrink-0 flex-col overflow-visible border-b border-[var(--header-border)] bg-[var(--surface)]/90 px-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex min-h-14 min-w-0 items-center gap-1.5 sm:min-h-[var(--header-height)] sm:gap-2">
        <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
          {!headerNavMode ? (
            <>
              <button
                type="button"
                className={`${HEADER_ICON_BTN} hidden lg:inline-flex`}
                onClick={toggleNavPlacement}
                aria-label="Switch to nav bar"
                title="Switch to nav bar"
              >
                <BiChevronsLeft className="text-lg" />
              </button>
              <button
                type="button"
                className={`${HEADER_ICON_BTN} lg:hidden`}
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                aria-label="Open navigation"
              >
                <BiMenu className="text-xl" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={`${HEADER_ICON_BTN} hidden lg:inline-flex`}
                onClick={toggleNavPlacement}
                aria-label="Switch to sidebar"
                title="Switch to sidebar"
              >
                <BiMenuAltLeft className="text-lg" />
              </button>
              <button
                type="button"
                className={`${HEADER_ICON_BTN} lg:hidden`}
                onClick={() => setHeaderMobileOpen((v) => !v)}
                aria-label="Open navigation"
              >
                <BiMenu className="text-xl" />
              </button>
            </>
          )}

          {headerNavMode ? (
            <Link
              href="/home"
              className="mr-1 hidden items-center gap-2 sm:flex"
              aria-label="Cyber Range Digiinn360 home"
            >
              <AppBrandMark size={36} />
              <span className="whitespace-nowrap text-sm font-extrabold leading-none tracking-tight">
                <span className="text-[var(--accent)]">Cyber Range</span>
                <span className="text-[var(--text)]"> Digiinn360</span>
              </span>
            </Link>
          ) : (
            <Link
              href="/home"
              className="hidden min-w-0 items-center gap-2 md:flex"
              title={userDisplayName}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-lg)] bg-[var(--sidebar-profile-bg)] text-xs font-bold leading-none text-[var(--sidebar-profile-fg)] sm:size-9 sm:text-sm">
                {userInitial}
              </span>
              <span className="hidden max-w-[10rem] truncate text-sm font-semibold leading-snug text-[var(--text)] lg:inline">
                Welcome,{" "}
                <span className="text-[var(--accent)]">{userDisplayName}</span>
              </span>
            </Link>
          )}
        </div>

        {headerNavMode ? (
          <div className="hidden min-w-0 flex-1 lg:flex">
            <HeaderNavMenu />
          </div>
        ) : (
          <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
            <HeaderEventPicker />
            <GlobalSearchBar className="mx-auto min-w-0 max-w-xl flex-1" />
          </div>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
          {LIVE_DASHBOARD_URL ? (
            <>
              <a
                href={LIVE_DASHBOARD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${HEADER_ICON_BTN} sm:hidden`}
                aria-label="Open live dashboard"
                title="Live dashboard"
              >
                <BiBarChartAlt2 className="text-lg" />
              </a>
              <a
                href={LIVE_DASHBOARD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-1.5 rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--input-bg)] px-2.5 py-2 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--surface-hover)] sm:inline-flex"
                title="Open live dashboard"
              >
                <BiBarChartAlt2 className="text-lg" />
                <span className="hidden lg:inline">Live dashboard</span>
              </a>
            </>
          ) : null}

          {!headerNavMode ? (
            <button
              type="button"
              className={`${HEADER_ICON_BTN} hidden xl:inline-flex`}
              aria-label="Toggle fullscreen"
              onClick={() => {
                if (document.fullscreenElement) void document.exitFullscreen();
                else void document.documentElement.requestFullscreen();
              }}
            >
              <BiFullscreen className="text-lg" />
            </button>
          ) : null}

          <NotificationsPanel iconButtonClassName={HEADER_ICON_BTN} />

          <button
            type="button"
            className={HEADER_ICON_BTN}
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <BiSun className="text-lg" />
            ) : (
              <BiMoon className="text-lg" />
            )}
          </button>

          <button
            type="button"
            className="hidden items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-fg)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--accent-hover)] md:inline-flex"
            title={userEmail || userDisplayName}
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--avatar-inner-bg)] text-xs font-bold text-[var(--avatar-inner-fg)]">
              {userInitial}
            </span>
            <span className="max-w-[8rem] truncate lg:max-w-[140px]">
              {userDisplayName || "Account"}
            </span>
          </button>

          {onLogout ? (
            <>
              <Button
                variant="danger"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={onLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "…" : "Log out"}
              </Button>
              <button
                type="button"
                className={`${HEADER_ICON_BTN} border-[var(--danger)]/30 bg-[var(--danger-muted)] text-[var(--danger)] sm:hidden`}
                onClick={onLogout}
                disabled={isLoggingOut}
                aria-label="Log out"
                title="Log out"
              >
                <BiLogOut className="text-lg" />
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-[var(--border)] py-2 md:hidden">
        <HeaderEventPicker fullWidth />
        <GlobalSearchBar className="w-full min-w-0" />
      </div>

      {headerNavMode && headerMobileOpen ? (
        <div className="relative lg:hidden">
          <button
            type="button"
            className="fixed inset-0 z-40 bg-[var(--overlay)]"
            aria-label="Close navigation"
            onClick={() => setHeaderMobileOpen(false)}
          />
          <div className="absolute inset-x-0 top-full z-50 max-h-[min(70vh,520px)] overflow-y-auto border-b border-[var(--border-strong)] bg-[var(--sidebar-bg)] shadow-[var(--shadow-lg)]">
            <HeaderMobileNav
              isPlatformOperator={isPlatformOperator}
              isEventOnlyAdmin={isEventOnlyAdmin}
              onNavigate={() => setHeaderMobileOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </header>
  );
}
