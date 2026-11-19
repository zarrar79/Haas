import type { NavChild } from "@/components/shell/nav-config";
import type { NavIconName } from "@/components/shell/nav-icon";

export type AdEventSectionId =
  | "overview"
  | "matchups"
  | "pauses"
  | "challenges"
  | "categories"
  | "namespaces"
  | "machines"
  | "services"
  | "flags"
  | "playings"
  | "submissions"
  | "uptime";

export const AD_EVENT_SECTIONS: {
  id: AdEventSectionId;
  label: string;
  icon: NavIconName;
}[] = [
  { id: "overview", label: "Overview", icon: "event-home" },
  { id: "matchups", label: "Matchups", icon: "event-teams" },
  { id: "pauses", label: "Pauses", icon: "event-settings" },
  { id: "challenges", label: "Challenges", icon: "event-challenges" },
  { id: "categories", label: "Service categories", icon: "catalog" },
  { id: "namespaces", label: "Namespaces", icon: "system-groups" },
  { id: "machines", label: "Machines", icon: "event-machines" },
  { id: "services", label: "Services", icon: "system-activity" },
  { id: "flags", label: "Flags", icon: "challenges" },
  { id: "playings", label: "Playings / teams", icon: "event-teams" },
  { id: "submissions", label: "Submissions", icon: "event-scores" },
  { id: "uptime", label: "Uptime", icon: "system-stats" },
];

const AD_EVENT_SECTION_IDS = new Set(
  AD_EVENT_SECTIONS.map((section) => section.id),
);

/** `/attack-defence/<eventId>` or `/attack-defence/<eventId>/<section>` */
export function adEventIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/attack-defence\/([^/]+)/);
  if (!match) return null;
  const segment = match[1];
  if (!segment || segment === "new") return null;
  return segment;
}

export function adEventSectionFromPathname(
  pathname: string,
): AdEventSectionId {
  const match = pathname.match(/^\/attack-defence\/[^/]+\/([^/]+)/);
  const segment = match?.[1];
  if (segment && AD_EVENT_SECTION_IDS.has(segment as AdEventSectionId)) {
    return segment as AdEventSectionId;
  }
  return "overview";
}

export function buildAdEventSectionHref(
  eventId: string,
  sectionId: AdEventSectionId,
) {
  if (sectionId === "overview") return `/attack-defence/${eventId}`;
  return `/attack-defence/${eventId}/${sectionId}`;
}

export function buildAdEventNavChildren(eventId: string | null): NavChild[] {
  const children: NavChild[] = [
    {
      id: "ad-all-events",
      label: "All events",
      href: "/attack-defence",
      icon: "hackathons-list",
      platformOnly: true,
    },
  ];
  if (!eventId) return children;

  for (const section of AD_EVENT_SECTIONS) {
    children.push({
      id: `ad-event-${section.id}`,
      label: section.label,
      href: buildAdEventSectionHref(eventId, section.id),
      icon: section.icon,
      platformOnly: true,
    });
  }
  return children;
}

export function isAdEventSectionHrefActive(
  pathname: string,
  href: string,
): boolean {
  if (href === "/attack-defence") {
    return pathname === "/attack-defence";
  }
  // Overview must be exact so section routes don't also highlight it.
  if (/^\/attack-defence\/[^/]+$/.test(href)) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
