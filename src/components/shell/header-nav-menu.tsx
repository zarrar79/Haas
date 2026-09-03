"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BiChevronDown } from "react-icons/bi";

import { HeaderEventPicker } from "@/components/shell/header-event-picker";
import { NavIcon } from "@/components/shell/nav-icon";
import {
  filterNavSections,
  flattenNavItems,
  isEventWorkspaceNavLocked,
  isNavHrefActive,
  isNavItemActive,
  resolveNavHref,
} from "@/components/shell/nav-utils";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import { useSelectWorkspace } from "@/features/events/select-workspace-modal";
import { useEffectiveHackathonId } from "@/features/events/use-effective-hackathon-id";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { listHackathons } from "@/features/hackathons/hackathon-api";
import type { NavChild, NavItem } from "@/components/shell/nav-config";

type HackathonOption = { id: string; label: string };

type MenuEntry = NavChild & { section?: string };

function buildMenuEntries(
  item: NavItem,
  hackathonLinks: HackathonOption[],
): MenuEntry[] {
  const entries: MenuEntry[] = [];
  const staticChildren = item.children ?? [];

  if (item.href) {
    entries.push({
      id: `${item.id}-overview`,
      label: "Overview",
      href: item.href,
      icon: item.icon,
    });
  }

  if (item.id === "hackathons") {
    for (const child of staticChildren) {
      entries.push(child);
    }
    if (hackathonLinks.length > 0) {
      entries.push({
        id: "hackathons-all-label",
        label: "All hackathons",
        href: "#",
        icon: "hackathons-list",
        section: "heading",
      });
      for (const h of hackathonLinks) {
        entries.push({
          id: `hackathon-${h.id}`,
          label: h.label,
          href: `/hackathons/${h.id}`,
          icon: "hackathons-list",
        });
      }
    }
    return entries;
  }

  for (const child of staticChildren) {
    entries.push(child);
  }
  return entries;
}

function NavDropdown({
  item,
  hackathonId,
  pathname,
  hackathonLinks = [],
}: {
  item: NavItem;
  hackathonId: string | null;
  pathname: string;
  hackathonLinks?: HackathonOption[];
}) {
  const { openSelectWorkspace } = useSelectWorkspace();
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);
  const active = isNavItemActive(pathname, item, hackathonId);
  const entries = buildMenuEntries(item, hackathonLinks);

  const updatePosition = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.left });
  }, []);

  function clearCloseTimer() {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function openMenu() {
    clearCloseTimer();
    updatePosition();
    setOpen(true);
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => setOpen(false), 180);
  }

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest("[data-header-nav-menu]")
      ) {
        return;
      }
      setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            data-header-nav-menu
            className="fixed z-[200] min-w-[240px] max-h-[min(70vh,480px)] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface)] py-1.5 shadow-[var(--shadow-lg)]"
            style={{ top: menuPos.top, left: menuPos.left }}
            role="menu"
            onMouseEnter={openMenu}
            onMouseLeave={scheduleClose}
          >
            {entries.map((entry) => {
              if (entry.section === "heading") {
                return (
                  <p
                    key={entry.id}
                    className="px-3 py-1.5 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-[var(--text-subtle)]"
                  >
                    {entry.label}
                  </p>
                );
              }
              const href = resolveNavHref(entry.href, hackathonId);
              const childActive = isNavHrefActive(pathname, href);
              const locked = isEventWorkspaceNavLocked(entry.href, hackathonId);
              if (locked) {
                return (
                  <button
                    key={entry.id}
                    type="button"
                    role="menuitem"
                    className="mx-1.5 flex w-[calc(100%-0.75rem)] items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-left text-[0.8125rem] font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                    onClick={() => {
                      setOpen(false);
                      openSelectWorkspace({
                        rawHref: entry.href,
                        label: entry.label,
                      });
                    }}
                  >
                    <NavIcon name={entry.icon} className="text-base opacity-80" />
                    {entry.label}
                  </button>
                );
              }
              return (
                <Link
                  key={entry.id}
                  href={href}
                  role="menuitem"
                  className={`mx-1.5 flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-[0.8125rem] font-medium transition ${
                    childActive
                      ? "bg-[var(--accent-muted)] font-semibold text-[var(--accent)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  <NavIcon name={entry.icon} className="text-base opacity-80" />
                  {entry.label}
                </Link>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        className="relative shrink-0"
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
      >
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => {
            updatePosition();
            setOpen((value) => !value);
          }}
          className={`flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1.5 text-[0.75rem] font-semibold transition xl:gap-1.5 xl:px-2.5 xl:text-[0.8125rem] ${
            active || open
              ? "bg-[var(--accent-muted)] text-[var(--accent)]"
              : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          }`}
        >
          <NavIcon name={item.icon} className="shrink-0 text-base" />
          <span className="whitespace-nowrap">{item.label}</span>
          <BiChevronDown
            className={`shrink-0 text-sm opacity-70 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </div>
      {menu}
    </>
  );
}

function NavLink({
  item,
  hackathonId,
  pathname,
}: {
  item: NavItem;
  hackathonId: string | null;
  pathname: string;
}) {
  const href = resolveNavHref(item.href!, hackathonId);
  const active = isNavHrefActive(pathname, href);

  return (
    <Link
      href={href}
      className={`flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1.5 text-[0.75rem] font-semibold transition xl:gap-1.5 xl:px-2.5 xl:text-[0.8125rem] ${
        active
          ? "bg-[var(--accent-muted)] text-[var(--accent)]"
          : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
      }`}
    >
      <NavIcon name={item.icon} className="shrink-0 text-base" />
      <span className="whitespace-nowrap">{item.label}</span>
    </Link>
  );
}

export function HeaderNavMenu() {
  const pathname = usePathname();
  const { isPlatformOperator, isEventOnlyAdmin, isLoading } = useHaasAccess();
  const effectiveHackathonId = useEffectiveHackathonId();
  const { selectedHackathonId } = useSelectedEvent();
  const hackathonId = effectiveHackathonId ?? selectedHackathonId;
  const [hackathons, setHackathons] = useState<HackathonOption[]>([]);

  const items = useMemo(
    () => flattenNavItems(filterNavSections(isPlatformOperator, isEventOnlyAdmin)),
    [isPlatformOperator, isEventOnlyAdmin],
  );

  useEffect(() => {
    void (async () => {
      try {
        const { items: rows } = await listHackathons({ show_deleted: "false" });
        setHackathons(
          rows.map((h) => ({
            id: h.id,
            label: h.display_name || h.name || h.id,
          })),
        );
      } catch {
        setHackathons([]);
      }
    })();
  }, []);

  if (isLoading) {
    return (
      <div className="hidden min-w-0 flex-1 lg:block">
        <div className="h-9 w-full max-w-md animate-pulse rounded-[var(--radius-sm)] bg-[var(--surface-hover)]" />
      </div>
    );
  }

  return (
    <nav
      className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-visible lg:flex"
      aria-label="Primary navigation"
    >
      <HeaderEventPicker />

      <div className="mx-0.5 h-5 w-px shrink-0 bg-[var(--border)]" />

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5">
        {items.map((item) =>
          item.children?.length ? (
            <NavDropdown
              key={item.id}
              item={item}
              hackathonId={hackathonId}
              pathname={pathname}
              hackathonLinks={item.id === "hackathons" ? hackathons : []}
            />
          ) : item.href ? (
            <NavLink
              key={item.id}
              item={item}
              hackathonId={hackathonId}
              pathname={pathname}
            />
          ) : null,
        )}
      </div>
    </nav>
  );
}
