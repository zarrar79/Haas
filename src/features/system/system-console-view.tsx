"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatsGridSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { StickyToolbar } from "@/components/ui/sticky-toolbar";
import { SystemActivityView } from "@/features/system/system-activity-view";
import { SystemAdminsSection } from "@/features/system/system-admins-section";
import { SystemGroupsView } from "@/features/system/system-groups-view";
import { SystemUsersView } from "@/features/system/system-users-view";
import {
  getSystemStats,
  listSystemAudit,
  type SystemStats,
} from "@/features/system/system-api";
import { ApiRequestError } from "@/lib/client-api";

type Section = "stats" | "users" | "admins" | "audit" | "activity" | "groups";

type Props = { section?: string };

export function SystemConsoleView({ section }: Props) {
  const router = useRouter();
  const active: Section =
    section === "users" ||
    section === "admins" ||
    section === "audit" ||
    section === "activity" ||
    section === "groups"
      ? section
      : "stats";

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(active === "stats" || active === "audit");
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [audit, setAudit] = useState<Record<string, unknown>[]>([]);

  const load = useCallback(async () => {
    if (active !== "stats" && active !== "audit") return;
    setIsLoading(true);
    setError(null);
    try {
      if (active === "stats") setStats(await getSystemStats());
      if (active === "audit") setAudit(await listSystemAudit());
    } catch (err) {
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load system data");
    } finally {
      setIsLoading(false);
    }
  }, [active, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const nav = [
    { id: "stats", href: "/system/stats", label: "Stats" },
    { id: "users", href: "/system/users", label: "Users" },
    { id: "admins", href: "/system/admins", label: "Event admins" },
    { id: "audit", href: "/system/audit", label: "Audit" },
    { id: "activity", href: "/system/activity", label: "Activity" },
    { id: "groups", href: "/system/groups", label: "Groups" },
  ] as const;

  const showLegacyLoader =
    isLoading && (active === "stats" || active === "audit");

  return (
    <div className="w-full">
      <PageHeader eyebrow="Platform" title="System" />

      <StickyToolbar layout="plain">
        <div className="flex flex-wrap gap-2">
          {nav.map((item) => (
            <Link key={item.id} href={item.href}>
              <Button
                size="sm"
                variant={active === item.id ? "primary" : "secondary"}
              >
                {item.label}
              </Button>
            </Link>
          ))}
        </div>
      </StickyToolbar>

      {error ? (
        <div className="mb-3">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      {showLegacyLoader ? (
        active === "stats" ? (
          <StatsGridSkeleton count={7} />
        ) : (
          <TableSkeleton columns={4} rows={8} />
        )
      ) : null}

      {!showLegacyLoader && active === "stats" && stats ? (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Object.entries(stats).map(([key, value]) => (
            <div
              key={key}
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <p className="text-xs text-[var(--text-muted)]">{key}</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--text)]">
                {String(value ?? 0)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {active === "users" ? <SystemUsersView /> : null}
      {active === "admins" ? <SystemAdminsSection /> : null}
      {active === "activity" ? <SystemActivityView /> : null}
      {active === "groups" ? <SystemGroupsView /> : null}

      {!showLegacyLoader && active === "audit" ? (
        <DataTable
          rows={audit}
          rowKey={(r) => String(r.id ?? JSON.stringify(r))}
          emptyMessage="No audit rows."
          columns={[
            {
              key: "action",
              header: "Action",
              render: (r) => String(r.action ?? "—"),
            },
            {
              key: "category",
              header: "Category",
              render: (r) => String(r.category ?? "—"),
            },
            {
              key: "when",
              header: "When",
              render: (r) => String(r.created_at ?? "—"),
            },
          ]}
        />
      ) : null}
    </div>
  );
}
