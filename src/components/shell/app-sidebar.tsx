"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { BiChevronDown } from "react-icons/bi";

import { NavIcon } from "@/components/shell/nav-icon";
import { AnimatedCollapsible } from "@/components/ui/animated-collapsible";
import {
  ADMIN_NAV_SECTIONS,
  type NavItem,
} from "@/components/shell/nav-config";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { useUiPreferences } from "@/theme/ui-preferences";

type AppSidebarProps = {
  isPlatformOperator?: boolean;
  forceExpanded?: boolean;
  userDisplayName?: string;
  userEmail?: string;
};

function filterSections(operator: boolean) {
  return ADMIN_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items
      .filter((item) => !item.platformOnly || operator)
      .map((item) => ({
        ...item,
        children: item.children?.filter(
          (child) => !child.platformOnly || operator,
        ),
      })),
  })).filter((section) => section.items.length > 0);
}

function resolveHref(href: string, id: string | null) {
  if (!href.includes("/events/current")) return href;
  return id ? href.replace("/events/current", `/events/${id}`) : "/hackathons";
}

export function AppSidebar({
  isPlatformOperator = false,
  forceExpanded = false,
  userDisplayName,
  userEmail,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { selectedHackathonId } = useSelectedEvent();
  const { sidebarCollapsed, setMobileNavOpen } = useUiPreferences();
  const collapsed = sidebarCollapsed && !forceExpanded;

  const sections = useMemo(
    () => filterSections(isPlatformOperator),
    [isPlatformOperator],
  );

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    hackathons: true,
    event: Boolean(selectedHackathonId),
    system: false,
  });

  const isActive = (href?: string) =>
    Boolean(
      href &&
        (href === "/home"
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`)),
    );

  const userInitial = userDisplayName
    ? userDisplayName.charAt(0).toUpperCase()
    : "?";

  function renderLink(item: NavItem, href: string, isChild = false) {
    const active = isActive(href);
    return (
      <Link
        key={`${item.id}-${href}`}
        href={href}
        onClick={() => setMobileNavOpen(false)}
        title={item.label}
        className={`group relative flex items-center gap-3 rounded-[var(--radius-sm)] transition ${
          isChild ? "py-2 pl-10 pr-3 text-[0.8125rem]" : "px-3 py-2.5 text-[0.9375rem]"
        } ${
          active
            ? "bg-[var(--sidebar-active-bg)] font-semibold text-[var(--sidebar-text)]"
            : "font-medium text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-text)]"
        } ${collapsed ? "justify-center px-2.5" : ""}`}
      >
        {active && !collapsed ? (
          <span
            className="absolute left-0 top-[15%] h-[70%] w-1 rounded-r bg-[var(--sidebar-accent)]"
            aria-hidden
          />
        ) : null}
        <NavIcon
          name={item.icon}
          className={`shrink-0 text-[1.15rem] ${
            active
              ? "text-[var(--sidebar-accent)]"
              : "text-[var(--sidebar-muted)] group-hover:text-[var(--sidebar-text)]"
          }`}
        />
        {!collapsed ? <span className="truncate">{item.label}</span> : null}
      </Link>
    );
  }

  return (
    <div className="flex h-full flex-col px-6 py-8">
      {/* Brand */}
      <Link
        href="/home"
        className={`mb-8 flex items-center gap-3 font-bold text-[var(--sidebar-text)] transition hover:opacity-90 ${
          collapsed ? "justify-center" : "pl-2"
        }`}
      >
        <NavIcon
          name="brand"
          className="text-[1.5rem] text-[var(--sidebar-accent)]"
        />
        {!collapsed ? (
          <span className="text-[1.35rem] tracking-tight">Admin</span>
        ) : null}
      </Link>

      {/* Navigation sections */}
      <nav
        className="flex flex-1 flex-col gap-6 overflow-y-auto"
        aria-label="Admin navigation"
      >
        {sections.map((section) => (
          <div key={section.id}>
            {!collapsed ? (
              <p className="mb-3 pl-3 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[var(--sidebar-section)]">
                {section.title}
              </p>
            ) : null}
            <div className="flex flex-col gap-1">
              {section.items.map((item) => {
                const hasChildren = Boolean(item.children?.length);
                const open = openGroups[item.id] ?? false;

                if (!hasChildren && item.href) {
                  const href = resolveHref(item.href, selectedHackathonId);
                  return renderLink(item, href);
                }

                return (
                  <div key={item.id} className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenGroups((prev) => ({
                          ...prev,
                          [item.id]: !prev[item.id],
                        }))
                      }
                      className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-2.5 text-left text-[0.9375rem] font-medium text-[var(--sidebar-muted)] transition hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-text)] ${
                        collapsed ? "justify-center px-2.5" : ""
                      }`}
                      title={item.label}
                    >
                      <span
                        className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}
                      >
                        <NavIcon
                          name={item.icon}
                          className="shrink-0 text-[1.15rem]"
                        />
                        {!collapsed ? item.label : null}
                      </span>
                      {!collapsed ? (
                        <BiChevronDown
                          className={`text-sm transition-transform duration-300 ease-out ${open ? "rotate-180" : "rotate-0"}`}
                          aria-hidden
                        />
                      ) : null}
                    </button>
                    <AnimatedCollapsible open={open && !collapsed}>
                      <div className="flex flex-col gap-0.5 pb-1 pt-0.5">
                        {item.children?.map((child) => {
                          const href = resolveHref(
                            child.href,
                            selectedHackathonId,
                          );
                          return renderLink(
                            { ...child, icon: child.icon },
                            href,
                            true,
                          );
                        })}
                      </div>
                    </AnimatedCollapsible>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
