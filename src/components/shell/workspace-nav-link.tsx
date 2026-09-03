"use client";

import Link from "next/link";

import { NavIcon, type NavIconName } from "@/components/shell/nav-icon";
import { resolveNavHref } from "@/components/shell/nav-utils";
import { useEventWorkspaceNavAction } from "@/features/events/select-workspace-modal";

type WorkspaceNavLinkProps = {
  href: string;
  label: string;
  icon: NavIconName;
  hackathonId: string | null;
  active?: boolean;
  isChild?: boolean;
  onNavigate?: () => void;
  className?: string;
  sidebar?: boolean;
};

export function WorkspaceNavLink({
  href,
  label,
  icon,
  hackathonId,
  active = false,
  isChild = false,
  onNavigate,
  className = "",
  sidebar = false,
}: WorkspaceNavLinkProps) {
  const { locked, onLockedClick } = useEventWorkspaceNavAction(
    href,
    label,
    hackathonId,
  );
  const resolvedHref = resolveNavHref(href, hackathonId);

  const baseClass = sidebar
    ? `group relative flex min-h-0 min-w-0 items-center gap-3 rounded-[var(--radius-sm)] transition ${
        isChild
          ? "py-2 pl-10 pr-3 text-[0.8125rem] leading-snug"
          : "px-3 py-2.5 text-[0.9375rem] leading-snug"
      } ${
        active
          ? "bg-[var(--sidebar-active-bg)] font-semibold text-[var(--sidebar-text)]"
          : "font-medium text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-text)]"
      }`
    : `flex w-full min-w-0 items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm ${
        active
          ? "bg-[var(--sidebar-active-bg)] font-semibold text-[var(--sidebar-accent)]"
          : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
      } ${className}`;

  if (locked) {
    return (
      <button
        type="button"
        className={`${baseClass} w-full text-left`}
        title={label}
        onClick={() => {
          onLockedClick();
          onNavigate?.();
        }}
      >
        <NavIcon
          name={icon}
          className={`shrink-0 text-[1.15rem] leading-none ${
            sidebar
              ? "text-[var(--sidebar-muted)]"
              : "text-[var(--text-muted)]"
          }`}
        />
        <span className="min-w-0 flex-1 truncate leading-snug">{label}</span>
      </button>
    );
  }

  return (
    <Link
      href={resolvedHref}
      onClick={onNavigate}
      title={label}
      className={baseClass}
    >
      {active && sidebar ? (
        <span
          className="absolute bottom-2 left-0 top-2 w-1 rounded-r bg-[var(--sidebar-accent)]"
          aria-hidden
        />
      ) : null}
      <NavIcon
        name={icon}
        className={`shrink-0 text-[1.15rem] leading-none ${
          active
            ? "text-[var(--sidebar-accent)]"
            : sidebar
              ? "text-[var(--sidebar-muted)] group-hover:text-[var(--sidebar-text)]"
              : "opacity-80"
        }`}
      />
      <span className="min-w-0 flex-1 truncate leading-snug">{label}</span>
    </Link>
  );
}
