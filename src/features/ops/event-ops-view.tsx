"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StickyToolbar } from "@/components/ui/sticky-toolbar";
import { TextField } from "@/components/ui/text-field";
import { HackathonPicker } from "@/features/events/hackathon-picker";
import type { HackathonAnalytics } from "@/features/hackathons/hackathon-api";
import {
  downloadAnalyticsExport,
  getEventAnalytics,
  listAuditLogs,
  listNotifications,
  listScores,
  sendNotification,
  type AuditLog,
  type NotificationRow,
  type ScoreRow,
} from "@/features/ops/ops-api";
import { EventAnalyticsDashboard } from "@/features/ops/event-analytics-dashboard";
import { ApiRequestError } from "@/lib/client-api";

type Tab = "overview" | "notifications" | "audit";

type Props = { hackathonId: string };

export function EventOpsView({ hackathonId }: Props) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(hackathonId);
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<HackathonAnalytics | null>(null);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");

  useEffect(() => {
    setActiveId(hackathonId);
  }, [hackathonId]);

  const load = useCallback(async () => {
    if (!activeId) return;
    setIsLoading(true);
    setError(null);
    try {
      if (tab === "overview") {
        const [a, s] = await Promise.all([
          getEventAnalytics(activeId),
          listScores(activeId, { limit: "100", show_deleted: "false" }),
        ]);
        setAnalytics(a);
        setScores(s);
      } else if (tab === "notifications") {
        setNotifications(await listNotifications(activeId));
      } else if (tab === "audit") {
        setAudit(await listAuditLogs(activeId));
      }
    } catch (err) {
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load ops data");
    } finally {
      setIsLoading(false);
    }
  }, [activeId, router, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSendNotification() {
    if (!notifTitle.trim() || !notifMessage.trim()) return;
    setBusyId("notif");
    try {
      await sendNotification(activeId, {
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        type: "staff",
        category: "public",
      });
      setNotifTitle("");
      setNotifMessage("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setBusyId(null);
    }
  }

  async function onExport() {
    try {
      await downloadAnalyticsExport(activeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "notifications", label: "Notifications" },
    { id: "audit", label: "Audit" },
  ];

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Event workspace"
        title="Operations"
        description="Run-day analytics, notifications, and admin audit. Scores, machines, and player logs have dedicated sections."
        actions={
          <>
            <Button variant="secondary" onClick={() => void load()}>
              Refresh
            </Button>
            <Button variant="secondary" onClick={() => void onExport()}>
              Export CSV
            </Button>
          </>
        }
      />

      <StickyToolbar layout="stack">
        <HackathonPicker value={activeId} onChange={setActiveId} section="ops" />

        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={tab === t.id ? "primary" : "secondary"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </StickyToolbar>

      {error ? (
        <div className="mb-3">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      ) : null}

      {!isLoading && tab === "overview" ? (
        <EventAnalyticsDashboard analytics={analytics} scores={scores} />
      ) : null}

      {!isLoading && tab === "notifications" ? (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2">
            <TextField
              label="Title"
              name="title"
              value={notifTitle}
              onChange={(e) => setNotifTitle(e.target.value)}
            />
            <TextField
              label="Message"
              name="message"
              value={notifMessage}
              onChange={(e) => setNotifMessage(e.target.value)}
            />
            <div className="sm:col-span-2">
              <Button
                disabled={busyId === "notif"}
                onClick={() => void onSendNotification()}
              >
                Send notification
              </Button>
            </div>
          </div>
          <DataTable
            rows={notifications}
            rowKey={(r) => r.id}
            emptyMessage="No notifications."
            columns={[
              { key: "title", header: "Title", render: (r) => r.title || "—" },
              {
                key: "message",
                header: "Message",
                render: (r) => (
                  <span className="line-clamp-2 text-xs">{r.message}</span>
                ),
              },
              {
                key: "when",
                header: "Created",
                render: (r) => r.created_at || "—",
              },
            ]}
          />
        </div>
      ) : null}

      {!isLoading && tab === "audit" ? (
        <DataTable
          rows={audit}
          rowKey={(r) => r.id}
          emptyMessage="No audit logs (viewers see none — use Activity logs)."
          columns={[
            { key: "action", header: "Action", render: (r) => r.action || "—" },
            {
              key: "resource",
              header: "Resource",
              render: (r) =>
                `${r.resource_type || ""} ${r.resource_id || ""}`.trim() || "—",
            },
            {
              key: "ok",
              header: "OK",
              render: (r) =>
                r.success === false ? (
                  <Badge tone="danger">Fail</Badge>
                ) : (
                  <Badge tone="success">OK</Badge>
                ),
            },
            {
              key: "when",
              header: "When",
              render: (r) => r.created_at || "—",
            },
          ]}
        />
      ) : null}
    </div>
  );
}
