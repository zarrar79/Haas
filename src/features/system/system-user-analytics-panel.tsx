"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { StatsGridSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import {
  getSystemUserAnalytics,
  type SystemUserAnalytics,
} from "@/features/system/system-api";

type Props = {
  userId: string;
};

function formatDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[var(--text)]">
        {value ?? 0}
      </p>
    </div>
  );
}

export function SystemUserAnalyticsPanel({ userId }: Props) {
  const [data, setData] = useState<SystemUserAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await getSystemUserAnalytics(userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return (
      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Analytics
        </h3>
        <StatsGridSkeleton count={6} />
        <TableSkeleton columns={3} rows={3} />
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Analytics
        </h3>
        <Alert variant="error">{error}</Alert>
      </section>
    );
  }

  if (!data) return null;

  return (
    <section className="space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
        Analytics
      </h3>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Active teams" value={data.memberships.active} />
        <Stat label="Captain of" value={data.memberships.captain} />
        <Stat label="Total score" value={data.scores.total} />
        <Stat label="Solves" value={data.scores.solves} />
        <Stat label="First blood pts" value={data.scores.first_blood} />
        <Stat label="Active machines" value={data.machines.active} />
      </div>

      {data.top_scores.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Top scores
          </p>
          <ul className="divide-y divide-[var(--border)] rounded-[var(--radius-sm)] border border-[var(--border)]">
            {data.top_scores.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="text-[var(--text)]">
                  {s.challenge || "—"}
                  <span className="text-[var(--text-muted)]">
                    {" "}
                    · {s.team || "—"}
                    {s.hackathon ? ` · ${s.hackathon}` : ""}
                  </span>
                </span>
                <span className="font-semibold tabular-nums text-[var(--text)]">
                  {(s.score || 0) +
                    (s.first_blood_score || 0) +
                    (s.bonus_score || 0)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.recent_activity.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Recent activity
          </p>
          <ul className="max-h-56 divide-y divide-[var(--border)] overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border)]">
            {data.recent_activity.map((a, i) => (
              <li key={`${a.date_time}-${i}`} className="px-3 py-2 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-[var(--text)]">
                    {a.type || "event"}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {formatDate(a.date_time)}
                  </span>
                </div>
                {a.message ? (
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {a.message}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
