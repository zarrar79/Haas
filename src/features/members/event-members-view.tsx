"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StickyToolbar } from "@/components/ui/sticky-toolbar";
import { TextField } from "@/components/ui/text-field";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import { HackathonPicker } from "@/features/events/hackathon-picker";
import {
  blockEventUser,
  deleteEventUser,
  eventUserDetailPath,
  eventUserLabel,
  listEventUsers,
  unblockEventUser,
  type EventUser,
} from "@/features/users/users-api";
import { UserFormModal } from "@/features/users/user-form-modal";
import { ApiRequestError } from "@/lib/client-api";

type Props = { hackathonId: string };

export function EventMembersView({ hackathonId }: Props) {
  const router = useRouter();
  const { canMutateEvent } = useHaasAccess();
  const [activeId, setActiveId] = useState(hackathonId);
  const [rows, setRows] = useState<EventUser[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<EventUser | null>(null);

  const canWrite = canMutateEvent(activeId);

  useEffect(() => {
    setActiveId(hackathonId);
  }, [hackathonId]);

  const load = useCallback(async () => {
    if (!activeId) return;
    setIsLoading(true);
    setError(null);
    try {
      setRows(
        await listEventUsers(activeId, {
          search: search.trim() || undefined,
        }),
      );
    } catch (err) {
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, [activeId, search, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onBlock(row: EventUser) {
    const reason = window.prompt("Block reason", "Blocked in HAS admin");
    if (reason == null) return;
    setBusyId(row.id);
    try {
      await blockEventUser(activeId, row.id, reason);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to block");
    } finally {
      setBusyId(null);
    }
  }

  async function onUnblock(row: EventUser) {
    setBusyId(row.id);
    try {
      await unblockEventUser(activeId, row.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unblock");
    } finally {
      setBusyId(null);
    }
  }

  async function onRemove(row: EventUser) {
    if (!window.confirm("Deactivate this user (soft delete)?")) return;
    setBusyId(row.id);
    try {
      await deleteEventUser(activeId, row.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Event workspace"
        title="Users"
        description="Hackathon-scoped user CRUD — list, create, update, block, and deactivate."
        actions={
          <>
            <Button variant="secondary" onClick={() => void load()}>
              Refresh
            </Button>
            {canWrite ? (
              <Button
                onClick={() => {
                  setEditingRow(null);
                  setModalOpen(true);
                }}
              >
                Create user
              </Button>
            ) : null}
          </>
        }
      />

      <StickyToolbar layout="stack">
        <div className="grid gap-3 sm:grid-cols-3">
          <HackathonPicker
            value={activeId}
            onChange={setActiveId}
            section="members"
          />
          <TextField
            label="Search"
            name="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email, username…"
          />
          <div className="flex items-end">
            <Button className="w-full" variant="secondary" onClick={() => void load()}>
              Apply
            </Button>
          </div>
        </div>
      </StickyToolbar>

      {error ? (
        <div className="mb-3">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      <DataTable
        isLoading={isLoading}
        rows={rows}
        rowKey={(r) => r.id}
        emptyMessage="No users for this event."
        columns={[
          {
            key: "user",
            header: "User",
            render: (row) => (
              <div>
                <Link
                  href={eventUserDetailPath(activeId, row.id)}
                  className="font-medium text-[var(--accent)] hover:underline"
                >
                  {eventUserLabel(row)}
                </Link>
                <div className="text-xs text-[var(--text-muted)]">
                  {row.email || row.username}
                </div>
              </div>
            ),
          },
          {
            key: "teams",
            header: "Teams",
            render: (row) =>
              row.teams?.length
                ? row.teams.map((t) => t.name || t.id).join(", ")
                : "—",
          },
          {
            key: "status",
            header: "Status",
            render: (row) =>
              row.is_block ? (
                <Badge tone="danger">Blocked</Badge>
              ) : row.is_active === false ? (
                <Badge>Inactive</Badge>
              ) : (
                <Badge tone="success">Active</Badge>
              ),
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            render: (row) =>
              canWrite ? (
                <div className="flex flex-wrap justify-end gap-2">
                  <Link
                    href={eventUserDetailPath(activeId, row.id)}
                    className="inline-flex items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-2 text-xs font-semibold text-[var(--text)] shadow-[var(--shadow-sm)] hover:bg-[var(--surface-hover)]"
                  >
                    View
                  </Link>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyId === row.id}
                    onClick={() => {
                      setEditingRow(row);
                      setModalOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  {row.is_block ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busyId === row.id}
                      onClick={() => void onUnblock(row)}
                    >
                      Unblock
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busyId === row.id}
                      onClick={() => void onBlock(row)}
                    >
                      Block
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === row.id}
                    onClick={() => void onRemove(row)}
                  >
                    Deactivate
                  </Button>
                </div>
              ) : (
                <Link
                  href={eventUserDetailPath(activeId, row.id)}
                  className="inline-flex items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-2 text-xs font-semibold text-[var(--text)] shadow-[var(--shadow-sm)] hover:bg-[var(--surface-hover)]"
                >
                  View
                </Link>
              ),
          },
        ]}
      />

      <UserFormModal
        open={modalOpen}
        mode={editingRow ? "edit" : "create"}
        hackathonId={activeId}
        userId={editingRow?.id}
        row={editingRow}
        onClose={() => {
          setModalOpen(false);
          setEditingRow(null);
        }}
        onSaved={() => void load()}
      />
    </div>
  );
}
