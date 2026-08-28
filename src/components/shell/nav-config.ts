import type { NavIconName } from "@/components/shell/nav-icon";

export type NavChild = {
  id: string;
  label: string;
  href: string;
  icon: NavIconName;
  /** Only show for platform operators */
  platformOnly?: boolean;
};

export type NavItem = {
  id: string;
  label: string;
  href?: string;
  icon: NavIconName;
  platformOnly?: boolean;
  /** Expandable children (event-scoped or related) */
  children?: NavChild[];
};

export type NavSection = {
  id: string;
  title: string;
  items: NavItem[];
};

/**
 * Primary admin navigation — Spark Admin-style grouped sections with icons.
 */
export const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    id: "menu",
    title: "Menu",
    items: [
      {
        id: "home",
        label: "Dashboard",
        href: "/home",
        icon: "overview",
      },
    ],
  },
  {
    id: "platform",
    title: "Platform",
    items: [
      {
        id: "hackathons",
        label: "Hackathons",
        href: "/hackathons",
        icon: "hackathons",
        children: [
          {
            id: "hackathons-list",
            label: "All events",
            href: "/hackathons",
            icon: "hackathons-list",
          },
          {
            id: "hackathons-new",
            label: "Create event",
            href: "/hackathons/new",
            icon: "hackathons-new",
            platformOnly: true,
          },
        ],
      },
      {
        id: "challenges",
        label: "Challenges",
        href: "/challenges",
        icon: "challenges",
      },
      {
        id: "teams",
        label: "Teams",
        href: "/teams",
        icon: "teams",
      },
      {
        id: "catalog",
        label: "Catalog",
        href: "/catalog",
        icon: "catalog",
        platformOnly: true,
      },
    ],
  },
  {
    id: "event",
    title: "Event workspace",
    items: [
      {
        id: "event",
        label: "Event workspace",
        icon: "event",
        children: [
          {
            id: "event-home",
            label: "Overview",
            href: "/events/current",
            icon: "event-home",
          },
          {
            id: "event-members",
            label: "Members",
            href: "/events/current/members",
            icon: "event-members",
          },
          {
            id: "event-teams",
            label: "Teams",
            href: "/events/current/teams",
            icon: "event-teams",
          },
          {
            id: "event-challenges",
            label: "Challenges",
            href: "/events/current/challenges",
            icon: "event-challenges",
          },
          {
            id: "event-question-answers",
            label: "Question answers",
            href: "/events/current/question-answers",
            icon: "event-question-answers",
          },
          {
            id: "event-scores",
            label: "Team scores",
            href: "/events/current/scores",
            icon: "event-scores",
          },
          {
            id: "event-machines",
            label: "Machines",
            href: "/events/current/machines",
            icon: "event-machines",
          },
          {
            id: "event-activity-logs",
            label: "Activity logs",
            href: "/events/current/activity-logs",
            icon: "event-activity-logs",
          },
          {
            id: "event-settings",
            label: "Settings",
            href: "/events/current/settings",
            icon: "event-settings",
          },
          {
            id: "event-ops",
            label: "Operations",
            href: "/events/current/ops",
            icon: "event-ops",
          },
        ],
      },
    ],
  },
  {
    id: "system",
    title: "System",
    items: [
      {
        id: "system",
        label: "System",
        icon: "system",
        platformOnly: true,
        children: [
          {
            id: "system-stats",
            label: "Stats",
            href: "/system/stats",
            icon: "system-stats",
          },
          {
            id: "system-users",
            label: "Users",
            href: "/system/users",
            icon: "system-users",
          },
          {
            id: "system-admins",
            label: "Admins",
            href: "/system/admins",
            icon: "system-admins",
          },
          {
            id: "system-audit",
            label: "Audit",
            href: "/system/audit",
            icon: "system-audit",
          },
          {
            id: "system-activity",
            label: "Activity",
            href: "/system/activity",
            icon: "system-activity",
          },
          {
            id: "system-groups",
            label: "Groups",
            href: "/system/groups",
            icon: "system-groups",
          },
        ],
      },
    ],
  },
];

/** Flat list for header nav placement */
export const ADMIN_NAV: NavItem[] = ADMIN_NAV_SECTIONS.flatMap(
  (section) => section.items,
);
