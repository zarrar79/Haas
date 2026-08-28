import { callAppApi } from "@/lib/client-api";
import {
  haasApiPath,
  unwrapHaasResult,
  type HaasForwardPayload,
} from "@/lib/haas-api";
import type { ApiResult } from "@/types";

export type DashboardHackathonMeta = {
  id: string;
  name: string;
  display_name: string;
  status: "inactive" | "upcoming" | "live" | "ended";
  is_active: boolean;
  is_deleted: boolean;
  start_datetime: string;
  end_datetime: string;
  is_infinite: boolean;
  progress: {
    percent: number | null;
    elapsed_seconds: number | null;
    remaining_seconds: number | null;
  };
  playing?: {
    id: string;
    is_active: boolean;
    is_open: boolean;
  } | null;
};

export type DashboardOverview = {
  teams: { total: number; active: number; blocked: number };
  members: {
    event_members: number;
    event_blocked: number;
    team_members: number;
    captains: number;
    pending_approvals: number;
  };
  users: number;
  challenges: { total: number; active: number; live_roster: number };
  submissions: {
    total: number;
    valid: number;
    invalid: number;
    first_bloods: number;
    total_points: number;
  };
  machines: {
    active: number;
    inactive: number;
    blocked: number;
    deleted: number;
  };
  activity: {
    total_logs: number;
    logins: number;
    spawns: number;
    stops: number;
    successful_submissions: number;
    invalid_submissions: number;
  };
  notifications: number;
  admins: number;
};

export type DashboardTeams = {
  by_register_as: { register_as: string | null; count: number }[];
  leaderboard: {
    team_id: string;
    team__name: string;
    team__register_as: string | null;
    team__team_code: string;
    total_score: number;
    solves: number;
    submissions: number;
  }[];
  largest_teams: { team_id: string; team__name: string; members: number }[];
  totals: { teams: number; active: number; blocked: number };
};

export type DashboardChallenges = {
  totals: {
    challenges: number;
    active: number;
    questions: number;
    live_roster: number;
  };
  top_by_solves: {
    challenge_id: string;
    challenge__name: string;
    solves: number;
    submissions: number;
    total_score: number;
    solve_rate_percent?: number;
  }[];
  by_difficulty: {
    challenge__difficulty_level__name: string | null;
    solves: number;
    submissions: number;
  }[];
  by_category: {
    challenge__category__name: string | null;
    solves: number;
    submissions: number;
  }[];
  unsolved: { id: string; name: string }[];
};

export type DashboardSubmissions = {
  window_hours: number;
  interval: string;
  totals: Record<string, number>;
  window_totals: Record<string, number>;
  timeline: {
    bucket: string | null;
    submissions?: number;
    valid?: number;
    invalid?: number;
    points?: number;
  }[];
  recent: {
    id: string;
    user__username?: string;
    team__name?: string;
    challenge__name?: string;
    challenges_questions__name?: string;
    total_score?: number;
    answer_validity?: boolean;
    created_at?: string;
  }[];
  top_users: {
    user_id: string;
    user__username?: string;
    total_score: number;
    solves: number;
  }[];
};

export type DashboardActivity = {
  window_hours: number;
  totals: { all_time: number; window: number };
  by_type: { type: string; count: number; label?: string }[];
  timeline: { bucket: string | null; events?: number }[];
  recent: {
    id: string;
    type: string;
    label?: string;
    message?: string;
    username?: string;
    date_time?: string;
  }[];
  admin_audit: {
    id: string;
    action: string;
    category?: string;
    resource_type?: string;
    success?: boolean;
    created_at?: string;
    actor__username?: string;
  }[];
};

export type DashboardMachines = {
  totals: Record<string, number>;
  by_challenge: {
    challenge_id: string;
    challenge__name: string;
    total: number;
    active: number;
  }[];
  by_team: {
    team_id: string;
    team__name: string;
    total: number;
    active: number;
  }[];
  recent: {
    id: string;
    machine_name?: string;
    ip_address?: string;
    is_active?: boolean;
    blocked?: boolean;
    challenge__name?: string;
    team__name?: string;
    spawned_by_user__username?: string;
    created_at?: string;
  }[];
};

export type DashboardMembers = {
  event_members: { active: number; blocked: number; removed: number };
  team_members: { active: number; pending: number; captains: number };
  by_user_type: { user__user_type: string | null; count: number }[];
  recent_event_members: {
    id: string;
    user__username?: string;
    user__email?: string;
    player_label?: string;
    is_blocked?: boolean;
    created_at?: string;
  }[];
  pending_team_approvals: {
    id: string;
    user__username?: string;
    team__name?: string;
    joined_at?: string;
  }[];
};

export type DashboardTimeline = {
  window_hours: number;
  interval: string;
  submissions: { bucket: string | null; count?: number }[];
  activity: { bucket: string | null; count?: number }[];
  machine_spawns: { bucket: string | null; count?: number }[];
};

export type HackathonDashboard = {
  generated_at: string;
  hackathon: DashboardHackathonMeta;
  params: { hours: number; interval: string; limit: number };
  overview?: DashboardOverview;
  teams?: DashboardTeams;
  challenges?: DashboardChallenges;
  submissions?: DashboardSubmissions;
  activity?: DashboardActivity;
  machines?: DashboardMachines;
  members?: DashboardMembers;
  timeline?: DashboardTimeline;
};

export type PlatformDashboard = {
  generated_at: string;
  params: { hours: number; limit: number };
  platform: {
    hackathons: { total: number; active: number; live: number };
    playing_instances: number;
    teams: number;
    users: number;
    hackathon_admins: number;
    active_machines: number;
    submissions: {
      all_time: number;
      window: number;
      window_valid: number;
    };
  };
  events: {
    hackathon: DashboardHackathonMeta;
    overview: DashboardOverview;
  }[];
  submissions_timeline: {
    bucket: string | null;
    submissions?: number;
    valid?: number;
  }[];
};

export async function getHackathonDashboard(
  hackathonId: string,
  filters?: {
    hours?: string;
    interval?: "hour" | "day";
    limit?: string;
    sections?: string;
  },
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<HackathonDashboard>>>(
    haasApiPath(`hackathons/${hackathonId}/dashboard`, filters),
  );
  return unwrapHaasResult(result).data;
}

export async function getPlatformDashboard(filters?: {
  hours?: string;
  limit?: string;
}) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<PlatformDashboard>>>(
    haasApiPath("system/dashboard", filters),
  );
  return unwrapHaasResult(result).data;
}
