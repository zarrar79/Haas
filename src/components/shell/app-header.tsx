"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BiChevronsLeft,
  BiFullscreen,
  BiMenu,
  BiMoon,
  BiSun,
} from "react-icons/bi";

import { Button } from "@/components/ui/button";
import { NotificationsPanel } from "@/components/shell/notifications-panel";
import { GlobalSearchBar } from "@/components/shell/global-search-bar";
import { NavIcon } from "@/components/shell/nav-icon";
import { ADMIN_NAV } from "@/components/shell/nav-config";
import { useTheme } from "@/theme/theme-provider";
import { useUiPreferences } from "@/theme/ui-preferences";

type AppHeaderProps = {
  isPlatformOperator?: boolean;
  userDisplayName?: string;
  userEmail?: string;
  onLogout?: () => void;
  isLoggingOut?: boolean;
};

export function AppHeader({
  isPlatformOperator = false,
  userDisplayName,
  userEmail,
  onLogout,
  isLoggingOut,
}: AppHeaderProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const {
    showApiTester,
    toggleApiTester,
    navPlacement,
    setNavPlacement,
    toggleSidebarCollapsed,
    setMobileNavOpen,
    mobileNavOpen,
  } = useUiPreferences();

  const headerNav = ADMIN_NAV.filter(
    (item) => (!item.platformOnly || isPlatformOperator) && item.href,
  );

  const userInitial = userDisplayName
    ? userDisplayName.charAt(0).toUpperCase()
    : "?";

  return (
    <header className="sticky top-0 z-40 -mx-4 mb-3 flex h-[var(--header-height)] shrink-0 items-center gap-3 border-b border-[var(--header-border)] bg-[var(--surface)]/90 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      {/* Left controls */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          className="hidden size-[42px] items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--input-bg)] text-[var(--text)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--surface-hover)] lg:inline-flex"
          onClick={toggleSidebarCollapsed}
          aria-label="Collapse sidebar"
        >
          <BiChevronsLeft className="text-lg" />
        </button>
        <button
          type="button"
          className="inline-flex size-[42px] items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--input-bg)] text-[var(--text)] shadow-[var(--shadow-sm)] lg:hidden"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          aria-label="Open navigation"
        >
          <BiMenu className="text-xl" />
        </button>

        {userDisplayName ? (
          <Link
            href="/home"
            className="hidden min-w-0 items-center gap-2.5 sm:flex"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-lg)] bg-[var(--sidebar-profile-bg)] text-sm font-bold text-[var(--sidebar-profile-fg)]">
              {userInitial}
            </span>
            <span className="truncate text-sm font-semibold text-[var(--text)]">
              Welcome,{" "}
              <span className="text-[var(--accent)]">{userDisplayName}</span>
            </span>
          </Link>
        ) : null}
      </div>

      {/* Header nav OR search */}
      {navPlacement === "header" ? (
        <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex">
          {headerNav.map((item) => (
            <Link
              key={item.id}
              href={item.href!}
              className={`flex items-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] px-3 py-2 text-xs font-semibold transition ${
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`)
                  ? "bg-[var(--accent-muted)] text-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              }`}
            >
              <NavIcon name={item.icon} className="text-base" />
              {item.label}
            </Link>
          ))}
        </nav>
      ) : (
        <GlobalSearchBar className="mx-auto hidden min-w-0 flex-1 max-w-xl sm:block" />
      )}

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="hidden size-[42px] items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--input-bg)] text-[var(--text)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--surface-hover)] xl:inline-flex"
          aria-label="Toggle fullscreen"
          onClick={() => {
            if (document.fullscreenElement) void document.exitFullscreen();
            else void document.documentElement.requestFullscreen();
          }}
        >
          <BiFullscreen className="text-lg" />
        </button>

        <NotificationsPanel />

        <button
          type="button"
          className="inline-flex size-[42px] items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--input-bg)] text-[var(--text)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--surface-hover)]"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <BiSun className="text-lg" />
          ) : (
            <BiMoon className="text-lg" />
          )}
        </button>

        <Button
          variant={showApiTester ? "primary" : "secondary"}
          size="sm"
          onClick={toggleApiTester}
        >
          API
        </Button>

        <button
          type="button"
          className="hidden items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-fg)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--accent-hover)] sm:inline-flex"
          title={userEmail || userDisplayName}
        >
          <span className="grid size-5 place-items-center rounded-full bg-[var(--avatar-inner-bg)] text-[0.65rem] font-bold text-[var(--avatar-inner-fg)]">
            {userInitial}
          </span>
          <span className="max-w-[120px] truncate">
            {userDisplayName || "Account"}
          </span>
        </button>

        {onLogout ? (
          <Button
            variant="danger"
            size="sm"
            onClick={onLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "…" : "Log out"}
          </Button>
        ) : null}

        <button
          type="button"
          className="hidden rounded-[var(--radius-sm)] px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-[var(--text-muted)] hover:text-[var(--text)] lg:inline"
          onClick={() =>
            setNavPlacement(navPlacement === "sidebar" ? "header" : "sidebar")
          }
          title="Toggle nav placement"
        >
          {navPlacement === "sidebar" ? "Nav→Header" : "Nav→Side"}
        </button>
      </div>
    </header>
  );
}
