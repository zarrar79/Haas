"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BiBell, BiPencil, BiTrash } from "react-icons/bi";

import { Button } from "@/components/ui/button";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import { ListSkeleton } from "@/components/ui/skeleton";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import { useEffectiveHackathonId } from "@/features/events/use-effective-hackathon-id";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { listHackathons } from "@/features/hackathons/hackathon-api";
import {
  deleteNotification,
  listNotifications,
  sendNotification,
  updateNotification,
  type NotificationRow,
} from "@/features/ops/ops-api";
import { listEventUsers } from "@/features/users/users-api";
import { HaasCapability } from "@/lib/haas-capabilities";

function formatWhen(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function NotificationsPanel({
  iconButtonClassName = "relative inline-flex size-[42px] items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--input-bg)] text-[var(--text)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--surface-hover)]",
}: {
  iconButtonClassName?: string;
}) {
  const { confirm } = usePlatformDialog();
  const effectiveHackathonId = useEffectiveHackathonId();
  const { selectedHackathonId, setSelectedHackathonId } = useSelectedEvent();
  const { hasCapability } = useHaasAccess();
  const [open, setOpen] = useState(false);
  const [hackathonId, setHackathonId] = useState(
    effectiveHackathonId ?? selectedHackathonId ?? "",
  );
  const [hackathons, setHackathons] = useState<{ id: string; label: string }[]>(
    [],
  );
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const next = effectiveHackathonId ?? selectedHackathonId ?? "";
    if (next) setHackathonId(next);
  }, [effectiveHackathonId, selectedHackathonId]);

  useEffect(() => {
    void (async () => {
      try {
        const { items } = await listHackathons({ show_deleted: "false" });
        setHackathons(
          items.map((h) => ({
            id: h.id,
            label: h.display_name || h.name || h.id,
          })),
        );
      } catch {
        setHackathons([]);
      }
    })();
  }, []);

  const canView =
    hackathonId && hasCapability(HaasCapability.NOTIFY_VIEW, hackathonId);
  const canWrite =
    hackathonId && hasCapability(HaasCapability.NOTIFY_SEND, hackathonId);

  const load = useCallback(async () => {
    if (!hackathonId || !canView) {
      setRows([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setRows(await listNotifications(hackathonId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load notifications",
      );
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [canView, hackathonId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setShowCreate(false);
        setEditingId(null);
      }
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function onCreate() {
    if (!hackathonId || !canWrite) return;
    if (!draftTitle.trim() || !draftMessage.trim()) {
      setError("Title and message are required.");
      return;
    }
    setBusyId("create");
    setError(null);
    try {
      const users = await listEventUsers(hackathonId, { limit: "500" });
      const userIds = users.map((u) => u.id).filter(Boolean);
      if (userIds.length === 0) {
        setError("No event users to notify.");
        return;
      }
      await sendNotification(hackathonId, {
        title: draftTitle.trim(),
        message: draftMessage.trim(),
        users_for: userIds,
        type: "team",
        category: "public",
      });
      setDraftTitle("");
      setDraftMessage("");
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setBusyId(null);
    }
  }

  async function onSaveEdit(row: NotificationRow) {
    if (!hackathonId || !canWrite) return;
    setBusyId(row.id);
    setError(null);
    try {
      await updateNotification(hackathonId, row.id, {
        title: editTitle.trim(),
        message: editMessage.trim(),
      });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(row: NotificationRow) {
    if (!hackathonId || !canWrite) return;
    const ok = await confirm({
      title: "Delete notification",
      message: `Delete notification "${row.title || row.id}"?`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    setBusyId(row.id);
    setError(null);
    try {
      await deleteNotification(hackathonId, row.id);
      if (editingId === row.id) setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusyId(null);
    }
  }

  function onHackathonChange(nextId: string) {
    setHackathonId(nextId);
    setSelectedHackathonId(nextId || null);
    setEditingId(null);
    setShowCreate(false);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        className={iconButtonClassName}
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <BiBell className="text-lg" />
        {rows.length > 0 ? (
          <span className="absolute right-2 top-2 size-2.5 rounded-full border-2 border-[var(--surface)] bg-[var(--success)]" />
        ) : null}
      </button>

      {open ? (
        <div className="dropdown-panel dropdown-panel-open absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(100vw-2rem,420px)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <p className="text-sm font-bold text-[var(--text)]">Notifications</p>
            <p className="mt-0.5 text-[0.65rem] text-[var(--text-muted)]">
              Per-event inbox — create, edit, and remove broadcasts.
            </p>
          </div>

          <div className="border-b border-[var(--border)] px-4 py-3">
            <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--text)]">Event</span>
              <select
                className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 text-sm text-[var(--text)]"
                value={hackathonId}
                onChange={(e) => onHackathonChange(e.target.value)}
              >
                <option value="">Select event…</option>
                {hackathons.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!hackathonId ? (
            <p className="px-4 py-6 text-sm text-[var(--text-muted)]">
              Select an event to manage notifications.
            </p>
          ) : !canView ? (
            <p className="px-4 py-6 text-sm text-[var(--text-muted)]">
              You do not have permission to view notifications for this event.
            </p>
          ) : (
            <>
              {canWrite ? (
                <div className="border-b border-[var(--border)] px-4 py-3">
                  {showCreate ? (
                    <div className="space-y-2">
                      <input
                        className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 text-sm"
                        placeholder="Title"
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                      />
                      <textarea
                        className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 text-sm"
                        placeholder="Message"
                        rows={2}
                        value={draftMessage}
                        onChange={(e) => setDraftMessage(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={busyId === "create"}
                          onClick={() => void onCreate()}
                        >
                          Send to all event users
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowCreate(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <Button size="sm" onClick={() => setShowCreate(true)}>
                        New notification
                      </Button>
                      {hackathonId ? (
                        <Link
                          href={`/events/${hackathonId}/ops`}
                          className="text-xs font-semibold text-[var(--accent)]"
                          onClick={() => setOpen(false)}
                        >
                          Ops page
                        </Link>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}

              {error ? (
                <p className="px-4 py-2 text-xs text-[var(--danger)]">{error}</p>
              ) : null}

              {isLoading ? (
                <div className="px-2 py-2">
                  <ListSkeleton rows={4} />
                </div>
              ) : rows.length === 0 ? (
                <p className="px-4 py-6 text-sm text-[var(--text-muted)]">
                  No notifications for this event.
                </p>
              ) : (
                <ul className="max-h-80 divide-y divide-[var(--border)] overflow-y-auto">
                  {rows.map((row) => {
                    const isEditing = editingId === row.id;
                    return (
                      <li key={row.id} className="px-4 py-3">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-sm"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                            />
                            <textarea
                              className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-sm"
                              rows={2}
                              value={editMessage}
                              onChange={(e) => setEditMessage(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                disabled={busyId === row.id}
                                onClick={() => void onSaveEdit(row)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-[var(--text)]">
                                {row.title || "Notification"}
                              </p>
                              {canWrite ? (
                                <div className="flex shrink-0 gap-1">
                                  <button
                                    type="button"
                                    className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                                    aria-label="Edit notification"
                                    disabled={busyId === row.id}
                                    onClick={() => {
                                      setEditingId(row.id);
                                      setEditTitle(row.title || "");
                                      setEditMessage(row.message || "");
                                    }}
                                  >
                                    <BiPencil className="text-sm" />
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded p-1 text-[var(--danger)] hover:bg-[var(--danger-muted)]"
                                    aria-label="Delete notification"
                                    disabled={busyId === row.id}
                                    onClick={() => void onDelete(row)}
                                  >
                                    <BiTrash className="text-sm" />
                                  </button>
                                </div>
                              ) : null}
                            </div>
                            {row.message ? (
                              <p className="mt-1 text-xs text-[var(--text-muted)]">
                                {row.message}
                              </p>
                            ) : null}
                            <p className="mt-1 text-[0.65rem] text-[var(--text-subtle)]">
                              {formatWhen(row.created_at)}
                              {row.recipient_count != null
                                ? ` · ${row.recipient_count} recipients`
                                : ""}
                            </p>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

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
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
