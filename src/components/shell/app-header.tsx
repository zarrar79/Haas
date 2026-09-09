"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BiBarChartAlt2,
  BiChevronsLeft,
  BiMenu,
  BiMenuAltLeft,
  BiMoon,
  BiSun,
} from "react-icons/bi";

import { Button } from "@/components/ui/button";
import { AppBrandMark } from "@/components/shell/app-brand-mark";
import { GlobalSearchBar } from "@/components/shell/global-search-bar";
import { HeaderEventPicker } from "@/components/shell/header-event-picker";
import { HeaderNavMenu } from "@/components/shell/header-nav-menu";
import { HeaderOverflowMenu } from "@/components/shell/header-overflow-menu";
import { NotificationsPanel } from "@/components/shell/notifications-panel";
import { personFirstName, personInitial } from "@/lib/display-name";
import { useIsXlUp } from "@/lib/use-media-query";
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

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const headerNavMode = navPlacement === "header";
  const firstName = personFirstName(userDisplayName);
  const userInitial = personInitial(userDisplayName);
  const isXlUp = useIsXlUp();

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  }

  return (
    <header className="relative sticky top-0 z-40 -mx-3 mb-3 flex shrink-0 flex-col overflow-visible border-b border-[var(--header-border)] bg-[var(--surface)]/90 px-3 backdrop-blur-md sm:-mx-6 sm:px-6 xl:-mx-8 xl:px-8">
      <div className="flex min-h-14 min-w-0 items-center gap-1.5 sm:min-h-[var(--header-height)] sm:gap-2">
        <div className="flex shrink-0 items-center gap-1.5">
          {headerNavMode ? (
            <button
              type="button"
              className={`${HEADER_ICON_BTN} max-xl:hidden`}
              onClick={toggleNavPlacement}
              aria-label="Switch to sidebar"
              title="Switch to sidebar"
            >
              <BiMenuAltLeft className="text-lg" />
            </button>
          ) : (
            <button
              type="button"
              className={`${HEADER_ICON_BTN} max-xl:hidden`}
              onClick={toggleNavPlacement}
              aria-label="Switch to nav bar"
              title="Switch to nav bar"
            >
              <BiChevronsLeft className="text-lg" />
            </button>
          )}
          <button
            type="button"
            className={`${HEADER_ICON_BTN} xl:hidden`}
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileNavOpen}
          >
            <BiMenu className="text-xl" />
          </button>

          {headerNavMode ? (
            <Link
              href="/home"
              className="mr-1 hidden items-center gap-2 xl:flex"
              aria-label="Cyber Range Digiinn360 home"
            >
              <AppBrandMark size={36} />
              <span className="whitespace-nowrap text-sm font-extrabold leading-none tracking-tight">
                <span className="text-[var(--accent)]">Cyber Range</span>
                <span className="text-[var(--text)]"> Digiinn360</span>
              </span>
            </Link>
          ) : null}
        </div>

        {headerNavMode ? (
          <>
            <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex xl:hidden">
              <HeaderEventPicker />
              <GlobalSearchBar className="min-w-0 flex-1" />
            </div>
            <div className="hidden min-w-0 flex-1 xl:flex">
              <HeaderNavMenu />
            </div>
          </>
        ) : (
          <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
            <HeaderEventPicker />
            <GlobalSearchBar className="min-w-0 flex-1" />
          </div>
        )}

        <div className="relative ml-auto flex min-w-0 shrink-0 items-center gap-1 sm:gap-1.5">
          {LIVE_DASHBOARD_URL ? (
            <a
              href={LIVE_DASHBOARD_URL}
              className={`${HEADER_ICON_BTN} xl:hidden`}
              aria-label="Open live dashboard"
              title="Live dashboard"
            >
              <BiBarChartAlt2 className="text-lg" />
            </a>
          ) : null}
          {LIVE_DASHBOARD_URL ? (
            <a
              href={LIVE_DASHBOARD_URL}
              className="max-xl:hidden hidden items-center gap-1.5 rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--input-bg)] px-2.5 py-2 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--surface-hover)] xl:inline-flex"
              title="Open live dashboard"
            >
              <BiBarChartAlt2 className="text-lg" />
              Live dashboard
            </a>
          ) : null}

          <NotificationsPanel
            hideTrigger={!isXlUp}
            iconButtonClassName={`${HEADER_ICON_BTN} relative`}
            open={notificationsOpen}
            onOpenChange={setNotificationsOpen}
          />

          <button
            type="button"
            className={`${HEADER_ICON_BTN} max-xl:hidden`}
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <BiSun className="text-lg" />
            ) : (
              <BiMoon className="text-lg" />
            )}
          </button>

          <div
            className="flex max-w-[9.5rem] shrink-0 items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--accent)] px-2 py-1.5 text-sm font-semibold text-[var(--accent-fg)] shadow-[var(--shadow-sm)] sm:max-w-[11rem] sm:px-3 sm:py-2"
            title={userEmail || userDisplayName}
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--avatar-inner-bg)] text-xs font-bold text-[var(--avatar-inner-fg)]">
              {userInitial}
            </span>
            <span className="min-w-0 truncate">{firstName}</span>
          </div>

          {onLogout ? (
            <Button
              variant="danger"
              size="sm"
              className="max-xl:hidden"
              onClick={onLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "…" : "Log out"}
            </Button>
          ) : null}

          <div className="xl:hidden">
            <HeaderOverflowMenu
              theme={theme}
              onToggleTheme={toggleTheme}
              onNotifications={() => setNotificationsOpen(true)}
              onFullscreen={toggleFullscreen}
              onLogout={onLogout}
              isLoggingOut={isLoggingOut}
            />
          </div>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2 border-t border-[var(--border)] py-2 md:hidden">
        <HeaderEventPicker fill className="basis-1/4" />
        <GlobalSearchBar className="min-w-0 basis-3/4" />
      </div>
    </header>
  );
}
