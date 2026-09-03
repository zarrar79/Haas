import { callAppApi } from "@/lib/client-api";
import {
  haasApiPath,
  unwrapHaasResult,
  type HaasForwardPayload,
} from "@/lib/haas-api";
import type { ApiResult } from "@/types";

export type OverviewPeriod = "24h" | "7d" | "30d";

export type OverviewKpis = {
  period: OverviewPeriod | string;
  window_hours: number;
  events_total?: number;
  events_active?: number;
  teams_total: number;
  teams_active: number;
  members_total: number;
  challenges_total: number;
  challenges_solved: number;
  challenge_solve_rate: number;
  submissions_total: number;
  submissions_valid: number;
  submissions_invalid: number;
  solve_rate: number;
  machines_active: number;
  window: {
    submissions_total: number;
    submissions_valid: number;
    submissions_invalid: number;
  };
};

export type OverviewActivityTimeline = {
  period: OverviewPeriod | string;
  window_hours: number;
  interval: string;
  intervals: number;
  points: { t: string; valid: number; invalid: number; logins: number }[];
  generated_at: string;
};

export type OverviewLeaderboard = {
  limit: number;
  items: {
    rank: number;
    team_id: string;
    name: string;
    team_code?: string | null;
    register_as?: string | null;
    score: number;
    solves: number;
    submissions: number;
    image_url?: string | null;
  }[];
};

export type OverviewTopChallenges = {
  limit: number;
  items: {
    challenge_id: string;
    name: string;
    difficulty: string;
    solves: number;
    submissions: number;
    total_score: number;
  }[];
};

export type OverviewDifficultyMix = {
  mode: string;
  easy: number;
  medium: number;
  hard: number;
  other: number;
  breakdown: { difficulty: string; count: number }[];
  solves_by_difficulty: { difficulty: string; solves: number }[];
  questions_total: number;
};

export type OverviewSubmissionsSummary = {
  period: OverviewPeriod | string;
  window_hours: number;
  valid: number;
  invalid: number;
  total: number;
  first_bloods: number;
  points: number;
  solve_rate: number;
  window: {
    valid: number;
    invalid: number;
    total: number;
    points: number;
  };
};

export type OverviewAnalyticsBundle = {
  kpis: OverviewKpis;
  activity: OverviewActivityTimeline;
  leaderboard: OverviewLeaderboard;
  topChallenges: OverviewTopChallenges;
  difficultyMix: OverviewDifficultyMix;
  submissions: OverviewSubmissionsSummary;
};

type OverviewFilters = {
  period?: OverviewPeriod | string;
  limit?: string;
  intervals?: string;
  /** When set, consolidates analytics for a single visible hackathon. */
  event_id?: string;
};

async function getOverviewSection<T>(
  hackathonId: string,
  section: string,
  filters?: OverviewFilters,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<T>>>(
    haasApiPath(`hackathons/${hackathonId}/overview/${section}`, {
      period: filters?.period,
      limit: filters?.limit,
      intervals: filters?.intervals,
    }),
  );
  return unwrapHaasResult(result).data;
}

export function getOverviewKpis(
  hackathonId: string,
  filters?: Pick<OverviewFilters, "period">,
) {
  return getOverviewSection<OverviewKpis>(hackathonId, "kpis", filters);
}

export function getOverviewActivityTimeline(
  hackathonId: string,
  filters?: Pick<OverviewFilters, "period" | "intervals">,
) {
  return getOverviewSection<OverviewActivityTimeline>(
    hackathonId,
    "activity-timeline",
    filters,
  );
}

export function getOverviewLeaderboard(
  hackathonId: string,
  filters?: Pick<OverviewFilters, "limit">,
) {
  return getOverviewSection<OverviewLeaderboard>(
    hackathonId,
    "leaderboard",
    filters,
  );
}

export function getOverviewTopChallenges(
  hackathonId: string,
  filters?: Pick<OverviewFilters, "limit">,
) {
  return getOverviewSection<OverviewTopChallenges>(
    hackathonId,
    "top-challenges",
    filters,
  );
}

export function getOverviewDifficultyMix(hackathonId: string) {
  return getOverviewSection<OverviewDifficultyMix>(
    hackathonId,
    "difficulty-mix",
  );
}

export function getOverviewSubmissionsSummary(
  hackathonId: string,
  filters?: Pick<OverviewFilters, "period">,
) {
  return getOverviewSection<OverviewSubmissionsSummary>(
    hackathonId,
    "submissions-summary",
    filters,
  );
}

/** Parallel fetch of the focused Overview analytics set. */
export async function getOverviewAnalyticsBundle(
  hackathonId: string,
  filters?: OverviewFilters,
): Promise<OverviewAnalyticsBundle> {
  const period = filters?.period ?? "7d";
  const limit = filters?.limit ?? "15";
  const intervals = filters?.intervals;

  const [kpis, activity, leaderboard, topChallenges, difficultyMix, submissions] =
    await Promise.all([
      getOverviewKpis(hackathonId, { period }),
      getOverviewActivityTimeline(hackathonId, { period, intervals }),
      getOverviewLeaderboard(hackathonId, { limit }),
      getOverviewTopChallenges(hackathonId, { limit }),
      getOverviewDifficultyMix(hackathonId),
      getOverviewSubmissionsSummary(hackathonId, { period }),
    ]);

  return {
    kpis,
    activity,
    leaderboard,
    topChallenges,
    difficultyMix,
    submissions,
  };
}

async function getDashboardSection<T>(
  section: string,
  filters?: OverviewFilters,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<T>>>(
    haasApiPath(`dashboard/${section}`, {
      period: filters?.period,
      limit: filters?.limit,
      intervals: filters?.intervals,
      event_id: filters?.event_id,
    }),
  );
  return unwrapHaasResult(result).data;
}

/** Parallel fetch of consolidated analytics across all visible hackathons. */
export async function getConsolidatedOverviewBundle(
  filters?: OverviewFilters,
): Promise<OverviewAnalyticsBundle> {
  const period = filters?.period ?? "7d";
  const limit = filters?.limit ?? "15";
  const intervals = filters?.intervals;

  const [kpis, activity, leaderboard, topChallenges, difficultyMix, submissions] =
    await Promise.all([
      getDashboardSection<OverviewKpis>("kpis", { period }),
      getDashboardSection<OverviewActivityTimeline>("activity-timeline", {
        period,
        intervals,
      }),
      getDashboardSection<OverviewLeaderboard>("leaderboard", { limit }),
      getDashboardSection<OverviewTopChallenges>("top-challenges", { limit }),
      getDashboardSection<OverviewDifficultyMix>("difficulty-mix"),
      getDashboardSection<OverviewSubmissionsSummary>("submissions-summary", {
        period,
      }),
    ]);

  return {
    kpis,
    activity,
    leaderboard,
    topChallenges,
    difficultyMix,
    submissions,
  };
}
