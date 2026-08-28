export type NavChild = {
  id: string;
  label: string;
  href: string;
  /** Only show for platform operators */
  platformOnly?: boolean;
};

export type NavItem = {
  id: string;
  label: string;
  href?: string;
  platformOnly?: boolean;
  /** Expandable children (event-scoped or related) */
  children?: NavChild[];
};

/**
 * Primary admin navigation.
 * Event-scoped children expand when a hackathon is selected (later steps).
 */
export const ADMIN_NAV: NavItem[] = [
  {
    id: "home",
    label: "Overview",
    href: "/home",
  },
  {
    id: "hackathons",
    label: "Hackathons",
    href: "/hackathons",
    children: [
      { id: "hackathons-list", label: "All events", href: "/hackathons" },
      {
        id: "hackathons-new",
        label: "Create event",
        href: "/hackathons/new",
        platformOnly: true,
      },
    ],
  },
  {
    id: "challenges",
    label: "Challenges",
    href: "/challenges",
  },
  {
    id: "teams",
    label: "Teams",
    href: "/teams",
  },
  {
    id: "event",
    label: "Event workspace",
    children: [
      { id: "event-home", label: "Overview", href: "/events/current" },
      { id: "event-members", label: "Members", href: "/events/current/members" },
      { id: "event-teams", label: "Teams", href: "/events/current/teams" },
      {
        id: "event-challenges",
        label: "Challenges",
        href: "/events/current/challenges",
      },
      {
        id: "event-question-answers",
        label: "Question answers",
        href: "/events/current/question-answers",
      },
      {
        id: "event-scores",
        label: "Team scores",
        href: "/events/current/scores",
      },
      {
        id: "event-machines",
        label: "Machines",
        href: "/events/current/machines",
      },
      {
        id: "event-activity-logs",
        label: "Activity logs",
        href: "/events/current/activity-logs",
      },
      {
        id: "event-settings",
        label: "Settings",
        href: "/events/current/settings",
      },
      { id: "event-ops", label: "Operations", href: "/events/current/ops" },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    href: "/catalog",
    platformOnly: true,
  },
  {
    id: "system",
    label: "System",
    platformOnly: true,
    children: [
      { id: "system-stats", label: "Stats", href: "/system/stats" },
      { id: "system-users", label: "Users", href: "/system/users" },
      { id: "system-admins", label: "Admins", href: "/system/admins" },
      { id: "system-audit", label: "Audit", href: "/system/audit" },
      { id: "system-activity", label: "Activity", href: "/system/activity" },
      { id: "system-groups", label: "Groups", href: "/system/groups" },
    ],
  },
];
