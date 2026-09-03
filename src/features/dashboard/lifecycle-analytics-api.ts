import { callAppApi } from "@/lib/client-api";
import {
  haasApiPath,
  unwrapHaasResult,
  type HaasForwardPayload,
} from "@/lib/haas-api";
import type { ApiResult } from "@/types";
import type { OverviewPeriod } from "@/features/dashboard/overview-analytics-api";

export type EventLifecycleItem = {
  event_id: string;
  name: string;
  status: "inactive" | "upcoming" | "live" | "ended" | string;
  is_active: boolean;
  is_infinite: boolean;
  start_datetime: string | null;
  end_datetime: string | null;
  registered_users: number;
  blocked_users: number;
  first_registration_at: string | null;
  last_registration_at: string | null;
  challenges_total: number;
  challenges_solved: number;
  valid_submissions: number;
  lifecycle: {
    percent: number | null;
    elapsed_seconds: number | null;
    remaining_seconds: number | null;
    total_seconds: number | null;
  };
  playing?: { id: string; is_open: boolean; is_active: boolean } | null;
};

export type EventsLifecycle = {
  events_total: number;
  items: EventLifecycleItem[];
  generated_at: string;
};

export type RegistrationsByEvent = {
  events_total: number;
  items: {
    event_id: string;
    name: string;
    registered: number;
    blocked: number;
  }[];
};

export type RegistrationTimeline = {
  period: OverviewPeriod | string;
  window_hours: number;
  events_total: number;
  generated_at: string;
  points: {
    t: string;
    registrations: number;
    active: number;
    cumulative: number;
    by_event: {
      event_id: string;
      name: string;
      registrations: number;
    }[];
  }[];
};

export type SolvesByEvent = {
  events_total: number;
  items: {
    event_id: string;
    name: string;
    challenges_total: number;
    challenges_solved: number;
    valid_submissions: number;
    solve_rate: number;
  }[];
};

export type LifecycleAnalyticsBundle = {
  events: EventsLifecycle;
  registrationsByEvent: RegistrationsByEvent;
  registrationTimeline: RegistrationTimeline;
  solvesByEvent: SolvesByEvent;
};

async function getLifecycleSection<T>(
  section: string,
  filters?: { period?: string; limit?: string; event_id?: string },
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<T>>>(
    haasApiPath(`dashboard/${section}`, {
      period: filters?.period,
      limit: filters?.limit,
      event_id: filters?.event_id,
    }),
  );
  return unwrapHaasResult(result).data;
}

export async function getLifecycleAnalyticsBundle(filters?: {
  period?: string;
  limit?: string;
  event_id?: string;
}): Promise<LifecycleAnalyticsBundle> {
  const period = filters?.period ?? "7d";
  const limit = filters?.limit ?? "20";
  const eventId = filters?.event_id;

  const [events, registrationsByEvent, registrationTimeline, solvesByEvent] =
    await Promise.all([
      getLifecycleSection<EventsLifecycle>("events-lifecycle", {
        limit,
        event_id: eventId,
      }),
      getLifecycleSection<RegistrationsByEvent>("registrations-by-event", {
        limit,
        event_id: eventId,
      }),
      getLifecycleSection<RegistrationTimeline>("registration-timeline", {
        period,
        event_id: eventId,
      }),
      getLifecycleSection<SolvesByEvent>("solves-by-event", {
        limit,
        event_id: eventId,
      }),
    ]);

  return {
    events,
    registrationsByEvent,
    registrationTimeline,
    solvesByEvent,
  };
}
