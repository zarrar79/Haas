"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CopyableText } from "@/components/ui/copyable-text";
import { DataTable } from "@/components/ui/data-table";
import { ListPageStat, ListPageStats } from "@/components/ui/list-page-stats";
import { FilterSelect, StickyToolbar } from "@/components/ui/sticky-toolbar";
import { HackathonPicker } from "@/features/events/hackathon-picker";
import { ACTIVITY_LOG_TYPES } from "@/features/ops/ops-api";
import {
  listSystemActivity,
  listSystemUsers,
  type SystemUser,
} from "@/features/system/system-api";
import { userLabel } from "@/lib/assigned-events";
import { ApiRequestError } from "@/lib/client-api";

type ActivityRow = {
  id?: string | number;
  type?: string;
  message?: string;
  ip_address?: string;
  date_time?: string;
  created_at?: string;
  submitted_by?: string;
  submitted_by_detail?: {
    name?: string;
    last_name?: string;
    username?: string;
    email?: string;
  };
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function activityUserLabel(row: ActivityRow) {
  const d = row.submitted_by_detail;
  if (!d) return row.submitted_by || "—";
  const name = [d.name, d.last_name].filter(Boolean).join(" ").trim();
  return name || d.username || d.email || row.submitted_by || "—";
}

function typeBadge(type?: string) {
  if (!type) return <span className="text-[var(--text-muted)]">—</span>;
  const submissionTypes = [
    "success_submissions",
    "invalid_submissions",
    "duplicated_submissions",
  ];
  const machineTypes = ["spawn_machine", "stop_machine"];
  let tone: "success" | "danger" | "warning" | undefined;
  if (submissionTypes.includes(type)) {
    tone =
      type === "success_submissions"
        ? "success"
        : type === "invalid_submissions"
          ? "danger"
          : "warning";
  } else if (machineTypes.includes(type)) {
    tone = type === "spawn_machine" ? "success" : "warning";
  }
  return <Badge tone={tone}>{type.replace(/_/g, " ")}</Badge>;
}

export function SystemActivityView() {
  const router = useRouter();
  const [hackathonFilter, setHackathonFilter] = useState("");
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [ipFilter, setIpFilter] = useState("");
  const [debouncedIp, setDebouncedIp] = useState("");
  const [dateAfter, setDateAfter] = useState("");
  const [dateBefore, setDateBefore] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedIp(ipFilter.trim()), 300);
    return () => window.clearTimeout(t);
  }, [ipFilter]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [logList, userList] = await Promise.all([
        listSystemActivity({
          hackathon: hackathonFilter || undefined,
          search: debouncedSearch || undefined,
          type: typeFilter || undefined,
          user: userFilter || undefined,
          ip: debouncedIp || undefined,
          date_after: dateAfter ? new Date(dateAfter).toISOString() : undefined,
          date_before: dateBefore
            ? new Date(dateBefore).toISOString()
            : undefined,
          ordering: "-date_time",
        }),
        listSystemUsers({}),
      ]);
      setRows(logList as ActivityRow[]);
      setUsers(userList);
    } catch (err) {
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load activity logs");
    } finally {
      setIsLoading(false);
    }
  }, [
    hackathonFilter,
    dateAfter,
    dateBefore,
    debouncedIp,
    debouncedSearch,
    router,
    typeFilter,
    userFilter,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-3">
      <StickyToolbar
        layout="stack"
        footer={
          <ListPageStats>
            <ListPageStat label="Entries" value={rows.length} />
          </ListPageStats>
        }
      >
        <div className="flex flex-wrap items-end gap-3">
          <HackathonPicker
            value={hackathonFilter}
            onChange={setHackathonFilter}
            navigateOnChange={false}
          />
          <label className="flex min-w-[180px] flex-col gap-1 text-xs text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text)]">Search</span>
            <input
              className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Message, user…"
            />
          </label>
          <FilterSelect label="Type" value={typeFilter} onChange={setTypeFilter}>
            <option value="">All types</option>
            {ACTIVITY_LOG_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="User" value={userFilter} onChange={setUserFilter}>
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {userLabel(u)}
              </option>
            ))}
          </FilterSelect>
          <label className="flex min-w-[140px] flex-col gap-1 text-xs text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text)]">IP</span>
            <input
              className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
              value={ipFilter}
              onChange={(e) => setIpFilter(e.target.value)}
              placeholder="Filter by IP"
            />
          </label>
          <label className="flex min-w-[160px] flex-col gap-1 text-xs text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text)]">After</span>
            <input
              type="datetime-local"
              className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
              value={dateAfter}
              onChange={(e) => setDateAfter(e.target.value)}
            />
          </label>
          <label className="flex min-w-[160px] flex-col gap-1 text-xs text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text)]">Before</span>
            <input
              type="datetime-local"
              className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
              value={dateBefore}
              onChange={(e) => setDateBefore(e.target.value)}
            />
          </label>
        </div>
      </StickyToolbar>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <DataTable
        rows={rows}
        rowKey={(r) => String(r.id ?? JSON.stringify(r))}
        isLoading={isLoading}
        emptyMessage="No activity logs."
        columns={[
          {
            key: "type",
            header: "Type",
            render: (r) => typeBadge(r.type),
          },
          {
            key: "message",
            header: "Message",
            render: (r) => (
              <span className="line-clamp-2 max-w-[280px] text-xs">
                {r.message || "—"}
              </span>
            ),
          },
          {
            key: "user",
            header: "User",
            render: (r) => activityUserLabel(r),
          },
          {
            key: "ip",
            header: "IP",
            render: (r) => (
              <CopyableText value={r.ip_address} maxWidthClass="max-w-[120px]" />
            ),
          },
          {
            key: "when",
            header: "When",
            render: (r) => (
              <span className="whitespace-nowrap text-xs text-[var(--text-muted)]">
                {formatDate(r.date_time || r.created_at)}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
