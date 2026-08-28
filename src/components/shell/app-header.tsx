"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ADMIN_NAV } from "@/components/shell/nav-config";
import { useTheme } from "@/theme/theme-provider";
import { useUiPreferences } from "@/theme/ui-preferences";

type AppHeaderProps = { isPlatformOperator?: boolean; userLabel?: string; onLogout?: () => void; isLoggingOut?: boolean };

export function AppHeader({ isPlatformOperator = false, userLabel, onLogout, isLoggingOut }: AppHeaderProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { showApiTester, toggleApiTester, navPlacement, setNavPlacement, toggleSidebarCollapsed, setMobileNavOpen, mobileNavOpen } = useUiPreferences();
  const headerNav = ADMIN_NAV.filter((item) => (!item.platformOnly || isPlatformOperator) && item.href);

  return (
    <header className="z-40 flex h-[var(--header-height)] shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 backdrop-blur sm:px-6">
      <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setMobileNavOpen(!mobileNavOpen)} aria-label="Open navigation"><span aria-hidden="true" data-icon="inline-start">≡</span></Button>
      <Button variant="ghost" size="sm" className="hidden lg:inline-flex" onClick={toggleSidebarCollapsed} aria-label="Collapse sidebar"><span aria-hidden="true" data-icon="inline-start">◧</span></Button>
      <Link href="/home" className="flex items-center gap-2 font-mono text-sm font-semibold tracking-[0.18em] text-[var(--accent)]"><span className="grid size-7 place-items-center rounded-[var(--radius-sm)] bg-[var(--accent)] text-xs text-[var(--accent-fg)]">H</span> HAS <span className="hidden text-[10px] font-normal tracking-[0.12em] text-[var(--text-muted)] sm:inline">{"// CONTROL PLANE"}</span></Link>
      {navPlacement === "header" ? <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex">{headerNav.map((item) => <Link key={item.id} href={item.href!} className={`whitespace-nowrap rounded-[var(--radius-sm)] px-3 py-2 text-xs font-medium transition ${pathname === item.href || pathname.startsWith(`${item.href}/`) ? "bg-[var(--accent-muted)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"}`}>{item.label}</Link>)}</nav> : <div className="min-w-0 flex-1" />}
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <span className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--success)] xl:flex"><span aria-hidden="true" className="text-[var(--cyan)]">●</span> systems nominal</span>
        <Button variant="ghost" size="sm" onClick={() => setNavPlacement(navPlacement === "sidebar" ? "header" : "sidebar")} title="Toggle nav placement">{navPlacement === "sidebar" ? "Nav→Header" : "Nav→Side"}</Button>
        <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label="Toggle theme">{theme === "dark" ? <span aria-hidden="true" data-icon="inline-start">☼</span> : <span aria-hidden="true" data-icon="inline-start">◐</span>}</Button>
        <Button variant={showApiTester ? "primary" : "secondary"} size="sm" onClick={toggleApiTester}><span aria-hidden="true" data-icon="inline-start">✦</span> <span className="hidden sm:inline">API</span></Button>
        {userLabel ? <span className="hidden max-w-[150px] truncate border-l border-[var(--border)] pl-3 text-xs text-[var(--text-muted)] sm:inline">{userLabel}</span> : null}
        {onLogout ? <Button variant="danger" size="sm" onClick={onLogout} disabled={isLoggingOut}>{isLoggingOut ? "…" : "Log out"}</Button> : null}
      </div>
    </header>
  );
}
