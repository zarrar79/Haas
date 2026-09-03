import {
  ADMIN_NAV_SECTIONS,
  type NavItem,
  type NavSection,
} from "@/components/shell/nav-config";

export const EVENT_ONLY_HIDDEN_IDS = new Set(["challenges", "teams"]);

export function filterNavSections(
  operator: boolean,
  eventOnlyAdmin: boolean,
): NavSection[] {
  return ADMIN_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items
      .filter((item) => {
        if (item.platformOnly && !operator) return false;
        if (eventOnlyAdmin && EVENT_ONLY_HIDDEN_IDS.has(item.id)) return false;
        return true;
      })
      .map((item) => ({
        ...item,
        children: item.children?.filter(
          (child) => !child.platformOnly || operator,
        ),
      })),
  })).filter((section) => section.items.length > 0);
}

export function flattenNavItems(sections: NavSection[]): NavItem[] {
  return sections.flatMap((section) => section.items);
}

export function resolveNavHref(href: string, hackathonId: string | null) {
  if (!href.includes("/events/current")) return href;
  return hackathonId
    ? href.replace("/events/current", `/events/${hackathonId}`)
    : href;
}

export const EVENT_WORKSPACE_PICKER_HINT =
  "Select an event workspace first. Use the Event picker in the header, or open Hackathons and click Enter workspace on an event.";

/** Short label for locked nav tooltips. */
export const EVENT_WORKSPACE_PICKER_HINT_SHORT =
  "Select an event in the header to unlock.";

export const EVENT_WORKSPACE_LOCKED_HINT = {
  title: "Select an event workspace",
  description:
    "Event workspace tabs stay locked until you choose which hackathon to work in.",
  steps: [
    "Use the Event picker in the header bar, or",
    "Open Hackathons and click Enter workspace on an event.",
  ],
} as const;

export function isEventWorkspaceNavHref(href: string) {
  return href.includes("/events/current");
}

export function isEventWorkspaceNavLocked(
  href: string,
  hackathonId: string | null,
) {
  return isEventWorkspaceNavHref(href) && !hackathonId;
}

/** Section segment after /events/current, or null for overview. */
export function eventWorkspaceSectionFromHref(href: string): string | null {
  if (!href.includes("/events/current")) return null;
  if (href === "/events/current" || href.endsWith("/events/current/")) {
    return null;
  }
  const suffix = href.replace(/^\/events\/current\/?/, "");
  return suffix || null;
}

export function buildEventWorkspacePath(
  hackathonId: string,
  rawHref: string,
): string {
  const section = eventWorkspaceSectionFromHref(rawHref);
  return section
    ? `/events/${hackathonId}/${section}`
    : `/events/${hackathonId}`;
}

/** Navigate to workspace overview, or keep the current event section. */
export function resolveEventWorkspaceNavigation(
  pathname: string,
  hackathonId: string,
): string {
  const sectionMatch = pathname.match(/^\/events\/(?:current|[^/]+)\/(.+)$/);
  if (sectionMatch?.[1]) {
    return `/events/${hackathonId}/${sectionMatch[1]}`;
  }
  return `/events/${hackathonId}`;
}

export function isNavHrefActive(pathname: string, href?: string) {
  if (!href) return false;
  return href === "/home"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function isNavItemActive(
  pathname: string,
  item: NavItem,
  hackathonId: string | null,
) {
  if (item.href && isNavHrefActive(pathname, resolveNavHref(item.href, hackathonId))) {
    return true;
  }
  return (
    item.children?.some((child) =>
      isNavHrefActive(pathname, resolveNavHref(child.href, hackathonId)),
    ) ?? false
  );
}
