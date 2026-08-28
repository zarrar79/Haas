"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ADMIN_NAV } from "@/components/shell/nav-config";
import { useTheme } from "@/theme/theme-provider";
import { useUiPreferences } from "@/theme/ui-preferences";

type AppHeaderProps = {
  isPlatformOperator?: boolean;
  userLabel?: string;
  onLogout?: () => void;
  isLoggingOut?: boolean;
};

export function AppHeader({
  isPlatformOperator = false,
  userLabel,
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

  return (
    <header className="z-40 flex h-[var(--header-height)] shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-3 sm:px-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          aria-label="Open navigation"
        >
          Menu
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="hidden lg:inline-flex"
          onClick={toggleSidebarCollapsed}
          aria-label="Collapse sidebar"
        >
          ≡
        </Button>
        <Link href="/home" className="font-semibold tracking-tight text-[var(--text)]">
          HAS
        </Link>
      </div>

      {navPlacement === "header" ? (
        <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex">
          {headerNav.map((item) => (
            <Link
              key={item.id}
              href={item.href!}
              className={`whitespace-nowrap rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm ${
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? "bg-[var(--accent-muted)] text-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : (
        <div className="min-w-0 flex-1" />
      )}

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            setNavPlacement(navPlacement === "sidebar" ? "header" : "sidebar")
          }
          title="Toggle nav placement"
        >
          {navPlacement === "sidebar" ? "Nav→Header" : "Nav→Side"}
        </Button>
        <Button variant="ghost" size="sm" onClick={toggleTheme}>
          {theme === "dark" ? "Light" : "Dark"}
        </Button>
        <Button
          variant={showApiTester ? "primary" : "secondary"}
          size="sm"
          onClick={toggleApiTester}
          title="Toggle API tester drawer"
        >
          API
        </Button>
        {userLabel ? (
          <span className="hidden max-w-[140px] truncate text-xs text-[var(--text-muted)] sm:inline">
            {userLabel}
          </span>
        ) : null}
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
      </div>
    </header>
  );
}
