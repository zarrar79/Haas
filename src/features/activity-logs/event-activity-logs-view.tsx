"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyableText } from "@/components/ui/copyable-text";
import { DataTable } from "@/components/ui/data-table";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { PageHeader } from "@/components/ui/page-header";
import { ListPageStat, ListPageStats } from "@/components/ui/list-page-stats";
import { FilterSelect, StickyToolbar } from "@/components/ui/sticky-toolbar";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import { ActivityLogFormModal } from "@/features/activity-logs/activity-log-form-modal";
import { HackathonPicker } from "@/features/events/hackathon-picker";
import { listEventUsers, eventUserLabel, type EventUser } from "@/features/users/users-api";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import {
  ACTIVITY_LOG_TYPES,
  deleteActivityLog,
  listActivityLogs,
  type ActivityLog,
} from "@/features/ops/ops-api";
import { ApiRequestError } from "@/lib/client-api";

type Props = { hackathonId: string };

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function userLabel(row: ActivityLog) {
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
  return (
    <Badge tone={tone}>
      {type.replace(/_/g, " ")}
    </Badge>
  );
}

export function EventActivityLogsView({ hackathonId }: Props) {
  const { confirm } = usePlatformDialog();
  const router = useRouter();
  const { canMutateEvent } = useHaasAccess();
  const [activeId, setActiveId] = useState(hackathonId);
  const [rows, setRows] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<EventUser[]>([]);
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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ActivityLog | null>(null);

  const canWrite = canMutateEvent(activeId);

  useEffect(() => {
    setActiveId(hackathonId);
  }, [hackathonId]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedIp(ipFilter.trim()), 300);
    return () => window.clearTimeout(t);
  }, [ipFilter]);

  const load = useCallback(async () => {
    if (!activeId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [logList, userList] = await Promise.all([
        listActivityLogs(activeId, {
          search: debouncedSearch || undefined,
          type: typeFilter || undefined,
          user: userFilter || undefined,
          ip: debouncedIp || undefined,
          date_after: dateAfter
            ? new Date(dateAfter).toISOString()
            : undefined,
          date_before: dateBefore
            ? new Date(dateBefore).toISOString()
            : undefined,
          ordering: "-date_time",
        }),
        listEventUsers(activeId),
      ]);
      setRows(logList);
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
    activeId,
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

  async function onDelete(row: ActivityLog) {
    const ok = await confirm({
      title: "Delete activity log",
      message: "Permanently delete this activity log entry?",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    setBusyId(String(row.id));
    try {
      await deleteActivityLog(activeId, row.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Event workspace"
        title="Activity logs"
        actions={
          canWrite ? (
            <Button
              onClick={() => {
                setEditingRow(null);
                setModalOpen(true);
              }}
            >
              Record log
            </Button>
          ) : undefined
        }
      />

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
            value={activeId}
            onChange={setActiveId}
            section="activity-logs"
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
          <FilterSelect
            label="Type"
            value={typeFilter}
            onChange={setTypeFilter}
          >
            <option value="">All types</option>
            {ACTIVITY_LOG_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="User"
            value={userFilter}
            onChange={setUserFilter}
          >
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {eventUserLabel(u)}
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

      {error ? (
        <div className="mb-3">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      <DataTable
        rows={rows}
        rowKey={(r) => String(r.id)}
        isLoading={isLoading}
        emptyMessage="No activity logs for this event."
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
            render: (r) => userLabel(r),
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
          {
            key: "actions",
            header: "",
            className: "text-right w-12",
            render: (r) =>
              canWrite ? (
                <RowActionsMenu
                  label={`Actions for log ${r.id}`}
                  items={[
                    {
                      id: "edit",
                      label: "Edit",
                      disabled: busyId === String(r.id),
                      onClick: () => {
                        setEditingRow(r);
                        setModalOpen(true);
                      },
                    },
                    {
                      id: "delete",
                      label: "Delete",
                      disabled: busyId === String(r.id),
                      destructive: true,
                      onClick: () => void onDelete(r),
                    },
                  ]}
                />
              ) : (
                <span className="text-xs text-[var(--text-muted)]">—</span>
              ),
          },
        ]}
      />

      <ActivityLogFormModal
        open={modalOpen}
        mode={editingRow ? "edit" : "create"}
        hackathonId={activeId}
        row={editingRow}
        users={users}
        onClose={() => {
          setModalOpen(false);
          setEditingRow(null);
        }}
        onSaved={() => void load()}
      />
    </div>
  );
}
