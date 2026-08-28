"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { ADMIN_NAV, type NavItem } from "@/components/shell/nav-config";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { useUiPreferences } from "@/theme/ui-preferences";

type AppSidebarProps = { isPlatformOperator?: boolean; forceExpanded?: boolean };
function filterNav(items: NavItem[], operator: boolean) { return items.filter((item) => !item.platformOnly || operator).map((item) => ({ ...item, children: item.children?.filter((child) => !child.platformOnly || operator) })); }
function resolveHref(href: string, id: string | null) { if (!href.includes("/events/current")) return href; return id ? href.replace("/events/current", `/events/${id}`) : "/hackathons"; }

export function AppSidebar({ isPlatformOperator = false, forceExpanded = false }: AppSidebarProps) {
  const pathname = usePathname(); const { selectedHackathonId } = useSelectedEvent(); const { sidebarCollapsed, setMobileNavOpen } = useUiPreferences(); const collapsed = sidebarCollapsed && !forceExpanded;
  const items = useMemo(() => filterNav(ADMIN_NAV, isPlatformOperator), [isPlatformOperator]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ hackathons: true, event: Boolean(selectedHackathonId), system: false });
  const isActive = (href?: string) => Boolean(href && (href === "/home" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)));
  return <nav className="flex h-full flex-col gap-1 p-4" aria-label="Admin navigation">
    <div className={`mb-5 border-b border-[var(--border)] px-2 pb-4 ${collapsed ? "text-center" : ""}`}><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">{collapsed ? "HAS" : "Mission control"}</p>{!collapsed ? <p className="mt-1 text-xs text-[var(--sidebar-muted)]">Cyberrange operations</p> : null}{!collapsed && selectedHackathonId ? <p className="mt-3 truncate font-mono text-[10px] text-[var(--cyan)]">EVENT / {selectedHackathonId.slice(0, 8)}</p> : null}</div>
    {items.map((item) => { const hasChildren = Boolean(item.children?.length); const open = openGroups[item.id] ?? false; if (!hasChildren && item.href) { const href = resolveHref(item.href, selectedHackathonId); return <Link key={item.id} href={href} onClick={() => setMobileNavOpen(false)} className={`group flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm transition ${isActive(href) ? "bg-[var(--accent-muted)] font-medium text-[var(--accent)]" : "text-[var(--sidebar-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"}`} title={item.label}><span aria-hidden="true" className={`text-xs ${isActive(href) ? "text-[var(--accent)]" : "text-[var(--border-strong)]"}`}>·</span>{collapsed ? item.label.slice(0, 1) : item.label}</Link>; } return <div key={item.id} className="flex flex-col gap-1"><button type="button" onClick={() => setOpenGroups((prev) => ({ ...prev, [item.id]: !prev[item.id] }))} className={`flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-2.5 text-left text-sm text-[var(--sidebar-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] ${collapsed ? "justify-center" : ""}`} title={item.label}><span className="flex items-center gap-3"><span className="font-mono text-[10px] text-[var(--cyan)]">{collapsed ? item.label.slice(0, 1) : "//"}</span>{collapsed ? null : item.label}</span>{!collapsed ? <span aria-hidden="true" className="font-mono text-xs">{open ? "⌄" : "›"}</span> : null}</button>{open && !collapsed ? item.children?.map((child) => { const href = resolveHref(child.href, selectedHackathonId); return <Link key={child.id} href={href} onClick={() => setMobileNavOpen(false)} className={`ml-4 rounded-[var(--radius-sm)] px-3 py-2 text-xs transition ${isActive(href) ? "bg-[var(--cyan-muted)] text-[var(--cyan)]" : "text-[var(--sidebar-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"}`}>{child.label}</Link>; }) : null}</div>; })}
  </nav>;
}
