export type AdminGuidanceItem = {
  id: string;
  title: string;
  description: string;
  tip: string;
  href: (hackathonId: string) => string;
};

export const EVENT_ADMIN_GUIDANCE: AdminGuidanceItem[] = [
  {
    id: "teams",
    title: "Teams roster",
    description: "Add teams to the event and manage members.",
    tip: "Use Teams → Add for roster attachment. Edit a team to change captain or remove members (max 5 per team).",
    href: (id) => `/events/${id}/teams`,
  },
  {
    id: "challenges",
    title: "Challenge roster",
    description: "Attach challenges and approve links for the live event.",
    tip: "Challenges tab shows Added vs Not added. Double-click a not-added row to attach quickly.",
    href: (id) => `/events/${id}/challenges`,
  },
  {
    id: "members",
    title: "Event members",
    description: "Create users, edit profiles, block/unblock participants.",
    tip: "Members are event-scoped. Block with a reason if someone violates rules.",
    href: (id) => `/events/${id}/members`,
  },
  {
    id: "machines",
    title: "Live machines",
    description: "Spawn, stop, and bulk-manage challenge VMs.",
    tip: "During the event this is your busiest screen. Stop all active if you need a hard reset.",
    href: (id) => `/events/${id}/machines`,
  },
  {
    id: "scores",
    title: "Scores & submissions",
    description: "Review valid/invalid flags and total points.",
    tip: "Filter by team or challenge when investigating a dispute.",
    href: (id) => `/events/${id}/scores`,
  },
  {
    id: "activity",
    title: "Activity logs",
    description: "Track logins, spawns, stops, and submission events.",
    tip: "Useful for forensics — pair with Team scores when validating a solve.",
    href: (id) => `/events/${id}/activity-logs`,
  },
  {
    id: "answers",
    title: "Question answers",
    description: "Manage flags and answer keys per challenge.",
    tip: "Activate/deactivate keys in bulk. Dynamic flags tie to machine IPs.",
    href: (id) => `/events/${id}/question-answers`,
  },
  {
    id: "settings",
    title: "Event settings",
    description: "Broadcast messages, limits, playing roster, modules.",
    tip: "Set spawn limits and playing roster before going live.",
    href: (id) => `/events/${id}/settings`,
  },
];

export const DASHBOARD_SECTION_TIPS: Record<string, string> = {
  overview:
    "High-level KPIs for the active event — teams, members, submissions, machines, and activity.",
  teams:
    "Team leaderboard by score, roster breakdown by side (red/blue/mix), and largest teams.",
  challenges:
    "Challenge solve rates, difficulty breakdown, and challenges with no solves yet.",
  submissions:
    "Submission volume over time, recent flags, and top scoring users.",
  activity:
    "Event log stream, activity by type, and recent admin audit actions.",
  machines:
    "Active VM counts by team/challenge and recently spawned instances.",
  members:
    "Event membership growth, pending team approvals, and blocked users.",
  timeline:
    "Combined timeline of submissions, admin activity, and machine spawns.",
};

export function formatDashboardNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString();
}

export function formatBucketLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
