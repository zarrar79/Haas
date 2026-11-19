"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BiPlus, BiShield } from "react-icons/bi";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import {
  ListPageStat,
  ListPageStats,
} from "@/components/ui/list-page-stats";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import { AdEventCreateModal } from "@/features/attack-defence/ad-event-create-modal";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import {
  deleteAdEvent,
  listAdEvents,
  type AdEvent,
} from "@/features/attack-defence/attack-defence-api";
import { redirectIfUnauthorized } from "@/lib/client-api";
import { formatDate } from "@/lib/format";

function statusTone(status: string) {
  switch (status) {
    case "running":
      return "success" as const;
    case "paused":
    case "scheduled":
      return "warning" as const;
    case "ended":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

export function AdEventListView() {
  const { confirm } = usePlatformDialog();
  const router = useRouter();
  const { isPlatformOperator } = useHaasAccess();
  const [rows, setRows] = useState<AdEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setRows(await listAdEvents());
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Failed to load AD events");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const onDelete = async (row: AdEvent) => {
    const ok = await confirm({
      title: "Deactivate event?",
      message: `Soft-delete “${row.name}”?`,
      confirmLabel: "Deactivate",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteAdEvent(row.id);
      await load();
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      <PageHeader
        eyebrow="Platform"
        title="Attack & Defence"
        description="AD events are separate from Jeopardy hackathons. End time is play length plus pauses."
        actions={
          isPlatformOperator ? (
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              disabled={busy}
            >
              <BiPlus className="mr-1" />
              Create event
            </Button>
          ) : null
        }
      />

      <AdEventCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(created) => {
          router.push(`/attack-defence/${created.id}`);
        }}
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <ListPageStats>
        <ListPageStat label="Events" value={String(rows.length)} />
        <ListPageStat
          label="Running"
          value={String(rows.filter((r) => r.status === "running").length)}
        />
        <ListPageStat
          label="Paused"
          value={String(rows.filter((r) => r.status === "paused").length)}
        />
      </ListPageStats>

      <DataTable
        isLoading={isLoading}
        emptyMessage="No Attack & Defence events yet."
        rows={rows}
        rowKey={(row) => row.id}
        columns={[
          {
            key: "name",
            header: "Event",
            render: (row) => (
              <button
                type="button"
                className="inline-flex items-center gap-2 text-left font-medium text-[var(--text)] hover:underline"
                onClick={() => router.push(`/attack-defence/${row.id}`)}
              >
                <BiShield className="opacity-70" />
                {row.name}
              </button>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (row) => (
              <Badge tone={statusTone(String(row.status))}>{row.status}</Badge>
            ),
          },
          {
            key: "rounds",
            header: "Rounds × duration",
            render: (row) => `${row.total_rounds} × ${row.round_duration_sec}s`,
          },
          {
            key: "window",
            header: "Start → end",
            render: (row) => (
              <span className="text-sm text-[var(--text-muted)]">
                {row.start_datetime ? formatDate(row.start_datetime) : "—"}
                {" → "}
                {row.end_datetime ? formatDate(row.end_datetime) : "—"}
              </span>
            ),
          },
          {
            key: "actions",
            header: "",
            sticky: "right",
            render: (row) =>
              isPlatformOperator ? (
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => router.push(`/attack-defence/${row.id}`)}
                  >
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void onDelete(row)}
                  >
                    Deactivate
                  </Button>
                </div>
              ) : null,
          },
        ]}
      />
    </div>
  );
}
