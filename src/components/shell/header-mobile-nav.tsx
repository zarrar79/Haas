"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { NavIcon } from "@/components/shell/nav-icon";
import {
  filterNavSections,
  flattenNavItems,
  isNavHrefActive,
  resolveNavHref,
} from "@/components/shell/nav-utils";
import { WorkspaceNavLink } from "@/components/shell/workspace-nav-link";
import { useEffectiveHackathonId } from "@/features/events/use-effective-hackathon-id";
import { useSelectedEvent } from "@/features/events/selected-event-context";

type Props = {
  isPlatformOperator?: boolean;
  isEventOnlyAdmin?: boolean;
  onNavigate?: () => void;
};

export function HeaderMobileNav({
  isPlatformOperator = false,
  isEventOnlyAdmin = false,
  onNavigate,
}: Props) {
  const pathname = usePathname();
  const { selectedHackathonId } = useSelectedEvent();
  const effectiveHackathonId = useEffectiveHackathonId();
  const hackathonId = effectiveHackathonId ?? selectedHackathonId;

  const items = useMemo(
    () => flattenNavItems(filterNavSections(isPlatformOperator, isEventOnlyAdmin)),
    [isPlatformOperator, isEventOnlyAdmin],
  );

  return (
    <nav className="flex flex-col gap-1 p-4" aria-label="Mobile navigation">
      {items.map((item) => {
        if (item.children?.length) {
          return (
            <div key={item.id} className="mb-2">
              <p className="mb-1 px-2 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--sidebar-section)]">
                {item.label}
              </p>
              {item.href ? (
                <Link
                  href={resolveNavHref(item.href, hackathonId)}
                  onClick={onNavigate}
                  className={`mb-0.5 flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-semibold ${
                    isNavHrefActive(pathname, resolveNavHref(item.href, hackathonId))
                      ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-accent)]"
                      : "text-[var(--sidebar-text)]"
                  }`}
                >
                  <NavIcon name={item.icon} />
                  Overview
                </Link>
              ) : null}
              {item.children.map((child) => {
                const rawHref = child.href;
                const href = resolveNavHref(rawHref, hackathonId);
                return (
                  <WorkspaceNavLink
                    key={child.id}
                    href={rawHref}
                    label={child.label}
                    icon={child.icon}
                    hackathonId={hackathonId}
                    active={isNavHrefActive(pathname, href)}
                    onNavigate={onNavigate}
                  />
                );
              })}
            </div>
          );
        }
        if (!item.href) return null;
        const href = resolveNavHref(item.href, hackathonId);
        return (
          <Link
            key={item.id}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-semibold ${
              isNavHrefActive(pathname, href)
                ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-accent)]"
                : "text-[var(--sidebar-text)]"
            }`}
          >
            <NavIcon name={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
