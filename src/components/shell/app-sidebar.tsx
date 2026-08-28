"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { ADMIN_NAV, type NavItem } from "@/components/shell/nav-config";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { useUiPreferences } from "@/theme/ui-preferences";

type AppSidebarProps = {
  isPlatformOperator?: boolean;
  forceExpanded?: boolean;
};

function filterNav(items: NavItem[], isPlatformOperator: boolean) {
  return items
    .filter((item) => !item.platformOnly || isPlatformOperator)
    .map((item) => ({
      ...item,
      children: item.children?.filter(
        (child) => !child.platformOnly || isPlatformOperator,
      ),
    }));
}

function resolveHref(href: string, selectedHackathonId: string | null) {
  if (!href.includes("/events/current")) return href;
  if (!selectedHackathonId) return "/hackathons";
  return href.replace("/events/current", `/events/${selectedHackathonId}`);
}

export function AppSidebar({
  isPlatformOperator = false,
  forceExpanded = false,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { selectedHackathonId } = useSelectedEvent();
  const { sidebarCollapsed, setMobileNavOpen } = useUiPreferences();
  const collapsed = sidebarCollapsed && !forceExpanded;
  const items = useMemo(
    () => filterNav(ADMIN_NAV, isPlatformOperator),
    [isPlatformOperator],
  );

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    hackathons: true,
    event: Boolean(selectedHackathonId),
    system: false,
  });

  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function isActive(href?: string) {
    if (!href) return false;
    if (href === "/home") return pathname === "/home";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav className="flex h-full flex-col gap-1 p-3">
      <div className={`mb-3 px-2 ${collapsed ? "text-center" : ""}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {collapsed ? "HAS" : "Hackathon as a Service"}
        </p>
        {!collapsed && selectedHackathonId ? (
          <p className="mt-1 truncate font-mono text-[10px] text-[var(--accent)]">
            Event {selectedHackathonId.slice(0, 8)}…
          </p>
        ) : null}
      </div>

      {items.map((item) => {
        const hasChildren = Boolean(item.children?.length);
        const open = openGroups[item.id] ?? false;

        if (!hasChildren && item.href) {
          const href = resolveHref(item.href, selectedHackathonId);
          return (
            <Link
              key={item.id}
              href={href}
              onClick={() => setMobileNavOpen(false)}
              className={`rounded-[var(--radius-sm)] px-3 py-2 text-sm transition ${
                isActive(href)
                  ? "bg-[var(--accent-muted)] text-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
              } ${collapsed ? "text-center" : ""}`}
              title={item.label}
            >
              {collapsed ? item.label.slice(0, 1) : item.label}
            </Link>
          );
        }

        return (
          <div key={item.id} className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => toggleGroup(item.id)}
              className={`flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] ${
                collapsed ? "justify-center" : ""
              }`}
              title={item.label}
            >
              <span>{collapsed ? item.label.slice(0, 1) : item.label}</span>
              {!collapsed ? (
                <span className="text-xs opacity-70">{open ? "−" : "+"}</span>
              ) : null}
            </button>

            {open && !collapsed
              ? item.children?.map((child) => {
                  const href = resolveHref(child.href, selectedHackathonId);
                  return (
                    <Link
                      key={child.id}
                      href={href}
                      onClick={() => setMobileNavOpen(false)}
                      className={`ml-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm transition ${
                        isActive(href)
                          ? "bg-[var(--accent-muted)] text-[var(--accent)]"
                          : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
                      }`}
                    >
                      {child.label}
                    </Link>
                  );
                })
              : null}
          </div>
        );
      })}
    </nav>
  );
}
