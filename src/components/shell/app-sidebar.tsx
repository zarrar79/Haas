"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { BiChevronDown } from "react-icons/bi";

import { AppBrandMark } from "@/components/shell/app-brand-mark";
import { NavIcon } from "@/components/shell/nav-icon";
import { AnimatedCollapsible } from "@/components/ui/animated-collapsible";
import {
  filterNavSections,
  resolveNavHref,
} from "@/components/shell/nav-utils";
import { WorkspaceNavLink } from "@/components/shell/workspace-nav-link";
import { useHackathonDisplayName } from "@/features/events/select-workspace-modal";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { useEffectiveHackathonId } from "@/features/events/use-effective-hackathon-id";
import { useScrollThumbVisible } from "@/lib/use-scroll-thumb-visible";
import { useUiPreferences } from "@/theme/ui-preferences";

type AppSidebarProps = {
  isPlatformOperator?: boolean;
  isEventOnlyAdmin?: boolean;
};

type NavItem = import("@/components/shell/nav-config").NavItem;

function filterSections(operator: boolean, eventOnlyAdmin: boolean) {
  return filterNavSections(operator, eventOnlyAdmin);
}

function resolveHref(href: string, id: string | null) {
  return resolveNavHref(href, id);
}

export function AppSidebar({
  isPlatformOperator = false,
  isEventOnlyAdmin = false,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { selectedHackathonId } = useSelectedEvent();
  const effectiveHackathonId = useEffectiveHackathonId();
  const workspaceHackathonId = effectiveHackathonId ?? selectedHackathonId;
  const workspaceLabel = useHackathonDisplayName(workspaceHackathonId);
  const { setMobileNavOpen } = useUiPreferences();
  const { ref: navScrollRef, className: navScrollClass } = useScrollThumbVisible();

  const sections = useMemo(
    () => filterSections(isPlatformOperator, isEventOnlyAdmin),
    [isPlatformOperator, isEventOnlyAdmin],
  );

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    hackathons: true,
    event: true,
    system: false,
  });

  const isActive = (href?: string) =>
    Boolean(
      href &&
        (href === "/home"
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`)),
    );

  function renderLink(item: NavItem, href: string, rawHref: string, isChild = false) {
    return (
      <WorkspaceNavLink
        key={`${item.id}-${rawHref}`}
        href={rawHref}
        label={item.label}
        icon={item.icon}
        hackathonId={workspaceHackathonId}
        active={isActive(href)}
        isChild={isChild}
        sidebar
        onNavigate={() => setMobileNavOpen(false)}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden px-3 pb-6 pt-0 sm:px-[var(--shell-padding-x)]">
      <Link
        href="/home"
        onClick={() => setMobileNavOpen(false)}
        className="mb-3 flex h-[var(--header-height)] w-full shrink-0 items-center gap-2.5 overflow-visible transition hover:opacity-90"
        aria-label="Cyber Range Digiinn360 home"
      >
        <AppBrandMark size={40} />
        <span className="min-w-0 truncate text-[1rem] font-extrabold leading-snug tracking-[0.01em] sm:text-[1.0625rem]">
          <span className="text-[var(--sidebar-accent)]">Cyber Range</span>
          <span className="text-[var(--sidebar-text)]"> Digiinn360</span>
        </span>
      </Link>

      <nav
        ref={navScrollRef}
        className={`flex min-h-0 flex-1 flex-col gap-6 overflow-x-hidden overflow-y-auto ${navScrollClass}`}
        aria-label="Admin navigation"
      >
        {sections.map((section) => (
          <div key={section.id}>
            <p className="mb-3 pl-3 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[var(--sidebar-section)]">
              {section.title}
            </p>
            <div className="flex min-w-0 flex-col gap-1">
              {section.items.map((item) => {
                const hasChildren = Boolean(item.children?.length);
                const open = openGroups[item.id] ?? false;

                if (!hasChildren && item.href) {
                  const rawHref = item.href;
                  const href = resolveHref(rawHref, workspaceHackathonId);
                  return renderLink(item, href, rawHref);
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
                      className="flex w-full min-w-0 items-center justify-between rounded-[var(--radius-sm)] px-3 py-2.5 text-left text-[0.9375rem] font-medium leading-snug text-[var(--sidebar-muted)] transition hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-text)]"
                      title={item.label}
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-3">
                        <NavIcon
                          name={item.icon}
                          className="shrink-0 text-[1.15rem] leading-none"
                        />
                        <span className="min-w-0 flex-1 leading-snug">
                          <span className="block truncate">{item.label}</span>
                          {item.id === "event" && workspaceLabel ? (
                            <span className="mt-0.5 block truncate text-[0.6875rem] font-semibold leading-tight text-[var(--sidebar-accent)]">
                              {workspaceLabel}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <BiChevronDown
                        className={`shrink-0 self-center text-sm leading-none transition-transform duration-300 ease-out ${open ? "rotate-180" : "rotate-0"}`}
                        aria-hidden
                      />
                    </button>
                    <AnimatedCollapsible open={open}>
                      <div className="flex min-w-0 flex-col gap-0.5 pb-1 pt-0.5">
                        {item.children?.map((child) => {
                          const rawHref = child.href;
                          const href = resolveHref(
                            rawHref,
                            workspaceHackathonId,
                          );
                          return renderLink(
                            { ...child, icon: child.icon },
                            href,
                            rawHref,
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
