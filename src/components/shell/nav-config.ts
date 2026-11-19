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
        id: "users",
        label: "Users",
        href: "/users",
        icon: "system-users",
        platformOnly: true,
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
        id: "event-home",
        label: "Overview",
        href: "/events/current",
        icon: "event-home",
      },
      {
        id: "event-hackathon",
        label: "Hackathon",
        href: "/events/current/hackathon",
        icon: "event-hackathon",
      },
      {
        id: "event-ctf",
        label: "CTF",
        icon: "event-ctf",
        children: [
          {
            id: "event-ctf-window",
            label: "Play window",
            href: "/events/current/ctf",
            icon: "event-ctf",
          },
          {
            id: "event-ctf-leaderboard",
            label: "Leaderboard",
            href: "/events/current/ctf/leaderboard",
            icon: "event-leaderboard",
          },
          {
            id: "event-ctf-challenges",
            label: "Challenges",
            href: "/events/current/ctf/challenges",
            icon: "event-challenges",
          },
          {
            id: "event-ctf-qa",
            label: "Question answers",
            href: "/events/current/ctf/question-answers",
            icon: "event-question-answers",
          },
          {
            id: "event-ctf-submissions",
            label: "Team submissions",
            href: "/events/current/ctf/submissions",
            icon: "event-scores",
          },
          {
            id: "event-ctf-machines",
            label: "Machines",
            href: "/events/current/ctf/machines",
            icon: "event-machines",
          },
        ],
      },
      {
        id: "event-koth",
        label: "King of the Hill",
        icon: "event-koth",
        children: [
          {
            id: "event-koth-sessions",
            label: "Sessions",
            href: "/events/current/koth",
            icon: "event-koth",
          },
          {
            id: "event-koth-window",
            label: "Play window",
            href: "/events/current/koth/schedule",
            icon: "event-settings",
          },
          {
            id: "event-koth-leaderboard",
            label: "Leaderboard",
            href: "/events/current/koth/leaderboard",
            icon: "event-leaderboard",
          },
        ],
      },
      {
        id: "event-ad",
        label: "Attack & Defense",
        icon: "event-ad",
        children: [
          {
            id: "event-ad-window",
            label: "Play window",
            href: "/events/current/ad",
            icon: "event-ad",
          },
        ],
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
            label: "Event admins",
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
          {
            id: "system-platform-settings",
            label: "Platform settings",
            href: "/system/platform-settings",
            icon: "system-platform-settings",
          },
          {
            id: "system-change-log",
            label: "Change log",
            href: "/system/change-log",
            icon: "system-change-log",
          },
          {
            id: "system-referer-gate",
            label: "Referer gate",
            href: "/system/referer-gate",
            icon: "system-referer-gate",
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
