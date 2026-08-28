"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BiBell } from "react-icons/bi";

import { InlineLoader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import {
  listNotifications,
  type NotificationRow,
} from "@/features/ops/ops-api";
import { HaasCapability } from "@/lib/haas-capabilities";

function formatWhen(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function NotificationsPanel() {
  const { selectedHackathonId } = useSelectedEvent();
  const { hasCapability } = useHaasAccess();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const canView =
    selectedHackathonId &&
    hasCapability(HaasCapability.NOTIFY_VIEW, selectedHackathonId);

  const load = useCallback(async () => {
    if (!selectedHackathonId || !canView) {
      setRows([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setRows(await listNotifications(selectedHackathonId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load notifications",
      );
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [canView, selectedHackathonId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const unreadCount = rows.length;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        className="relative inline-flex size-[42px] items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--input-bg)] text-[var(--text)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--surface-hover)]"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <BiBell className="text-lg" />
        {unreadCount > 0 ? (
          <span className="absolute right-2 top-2 size-2.5 rounded-full border-2 border-[var(--surface)] bg-[var(--success)]" />
        ) : null}
      </button>

      {open ? (
        <div className="dropdown-panel dropdown-panel-open absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(100vw-2rem,360px)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <p className="text-sm font-bold text-[var(--text)]">Notifications</p>
            {selectedHackathonId ? (
              <Link
                href={`/events/${selectedHackathonId}/ops`}
                className="text-xs font-semibold text-[var(--accent)]"
                onClick={() => setOpen(false)}
              >
                Send
              </Link>
            ) : null}
          </div>

          {!selectedHackathonId ? (
            <p className="px-4 py-6 text-sm text-[var(--text-muted)]">
              Select an event from the workspace to view notifications.
            </p>
          ) : isLoading ? (
            <div className="flex justify-center py-8">
              <InlineLoader label="Loading notifications…" />
            </div>
          ) : error ? (
            <p className="px-4 py-6 text-sm text-[var(--danger)]">{error}</p>
          ) : rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--text-muted)]">
              No notifications for this event.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-[var(--border)] overflow-y-auto">
              {rows.map((row) => (
                <li key={row.id} className="px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--text)]">
                    {row.title || "Notification"}
                  </p>
                  {row.message ? (
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {row.message}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[0.65rem] text-[var(--text-subtle)]">
                    {formatWhen(row.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {selectedHackathonId ? (
            <div className="border-t border-[var(--border)] px-4 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => void load()}
              >
                Refresh
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
