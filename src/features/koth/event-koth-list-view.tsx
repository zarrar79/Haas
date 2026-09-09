"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BiPlus, BiCrown } from "react-icons/bi";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import {
  ListPageStat,
  ListPageStats,
  ListPageStatsDot,
} from "@/components/ui/list-page-stats";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import { HackathonPicker } from "@/features/events/hackathon-picker";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import {
  createKothSession,
  deleteKothSession,
  listKothSessions,
  updateKothSession,
  type KothSession,
} from "@/features/koth/koth-api";
import { redirectIfUnauthorized } from "@/lib/client-api";
import { formatDate } from "@/lib/format";

type Props = { hackathonId: string };

function statusTone(status: string) {
  switch (status) {
    case "running":
      return "success" as const;
    case "paused":
      return "warning" as const;
    case "stopped":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

export function EventKothListView({ hackathonId }: Props) {
  const { confirm, prompt } = usePlatformDialog();
  const router = useRouter();
  const { canMutateEvent } = useHaasAccess();
  const { setSelectedHackathonId } = useSelectedEvent();
  const [activeId, setActiveId] = useState(hackathonId);
  const [rows, setRows] = useState<KothSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canWrite = canMutateEvent(activeId);
  const busy = busyId !== null;

  useEffect(() => {
    setActiveId(hackathonId);
  }, [hackathonId]);

  const load = useCallback(async () => {
    if (!activeId) return;
    setIsLoading(true);
    setError(null);
    try {
      setRows(await listKothSessions(activeId));
    } catch (err) {
      if (redirectIfUnauthorized(err)) return;
      setError(err instanceof Error ? err.message : "Failed to load KOTH instances");
    } finally {
      setIsLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openSession = (sessionId: string) => {
    router.push(`/events/${activeId}/koth/${sessionId}`);
  };

  const onCreate = async () => {
    const name = await prompt({
      title: "Create KOTH instance",
      message:
        "Each instance has its own scores, ingest token, and scorer settings.",
      label: "Name",
      defaultValue: `KOTH ${rows.length + 1}`,
      confirmLabel: "Create",
    });
    if (name == null) return;
    const trimmed = name.trim() || `KOTH ${rows.length + 1}`;
    setBusyId("create");
    setError(null);
    try {
      const created = await createKothSession(activeId, { name: trimmed });
      await load();
      openSession(created.id);
    } catch (err) {
      if (redirectIfUnauthorized(err)) return;
      setError(err instanceof Error ? err.message : "Failed to create KOTH");
    } finally {
      setBusyId(null);
    }
  };

  const onRename = async (row: KothSession) => {
    const name = await prompt({
      title: "Rename KOTH instance",
      label: "Name",
      defaultValue: row.name || "",
      confirmLabel: "Save",
    });
    if (name == null) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === row.name) return;
    setBusyId(row.id);
    setError(null);
    try {
      await updateKothSession(activeId, row.id, { name: trimmed });
      await load();
    } catch (err) {
      if (redirectIfUnauthorized(err)) return;
      setError(err instanceof Error ? err.message : "Failed to rename");
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (row: KothSession) => {
    const ok = await confirm({
      title: "Delete KOTH instance?",
      message:
        `“${row.name}” will be removed from this list.\n` +
        (row.status === "running" || row.status === "paused"
          ? "It will be stopped first.\n"
          : "") +
        "Scores and hold history remain in the database but the instance will no longer be usable from Haas.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    setBusyId(row.id);
    setError(null);
    try {
      await deleteKothSession(activeId, row.id);
      await load();
    } catch (err) {
      if (redirectIfUnauthorized(err)) return;
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="King of the Hill"
        description="Create, open, rename, or delete KOTH instances for this hackathon. Each instance is scored separately."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <HackathonPicker
              value={activeId}
              onChange={(nextId) => {
                setActiveId(nextId);
                setSelectedHackathonId(nextId);
                router.push(`/events/${nextId}/koth`);
              }}
              section="koth"
            />
            {canWrite ? (
              <Button size="sm" disabled={busy} onClick={() => void onCreate()}>
                <BiPlus className="mr-1" />
                {busyId === "create" ? "Creating…" : "New KOTH"}
              </Button>
            ) : null}
          </div>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <ListPageStats>
        <ListPageStat label="Instances" value={String(rows.length)} />
        <ListPageStatsDot />
        <ListPageStat
          label="Running"
          value={String(rows.filter((r) => r.status === "running").length)}
        />
      </ListPageStats>

      <DataTable
        isLoading={isLoading}
        emptyMessage="No KOTH instances yet. Create one to get started."
        rowKey={(row) => row.id}
        rows={rows}
        onRowDoubleClick={(row) => openSession(row.id)}
        columns={[
          {
            key: "name",
            header: "Instance",
            render: (row) => (
              <button
                type="button"
                className="text-left font-medium text-[var(--accent)] hover:underline"
                onClick={() => openSession(row.id)}
              >
                <span className="inline-flex items-center gap-1">
                  <BiCrown />
                  {row.name}
                </span>
              </button>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (row) => (
              <Badge tone={statusTone(row.status)}>{row.status}</Badge>
            ),
          },
          {
            key: "king",
            header: "Current king",
            render: (row) =>
              row.current_team_name
                ? `${row.current_team_name}${
                    row.current_team_code ? ` (${row.current_team_code})` : ""
                  }`
                : "—",
          },
          {
            key: "scoring",
            header: "Scoring",
            render: (row) =>
              `+${row.initial_score} / +${row.hold_score} each ${row.hold_interval_seconds}s`,
          },
          {
            key: "teams",
            header: "Teams scored",
            render: (row) => String(row.team_score_count ?? 0),
          },
          {
            key: "updated",
            header: "Updated",
            render: (row) => formatDate(row.updated_at),
          },
          {
            key: "actions",
            header: "Actions",
            className: "whitespace-nowrap",
            render: (row) => (
              <div className="inline-flex flex-nowrap items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => openSession(row.id)}>
                  Open
                </Button>
                {canWrite ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void onRename(row)}
                    >
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busy}
                      onClick={() => void onDelete(row)}
                    >
                      {busyId === row.id ? "Deleting…" : "Delete"}
                    </Button>
                  </>
                ) : null}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
