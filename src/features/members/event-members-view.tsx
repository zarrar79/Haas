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
import {
  addMember,
  blockMember,
  createEventUser,
  listMembers,
  removeMember,
  unblockMember,
  type EventMember,
} from "@/features/members/member-api";
import { ApiRequestError } from "@/lib/client-api";

type Props = { hackathonId: string };

export function EventMembersView({ hackathonId }: Props) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(hackathonId);
  const [rows, setRows] = useState<EventMember[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [playerLabel, setPlayerLabel] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    username: "",
    password: "",
    name: "",
    last_name: "",
    player_label: "",
  });

  useEffect(() => {
    setActiveId(hackathonId);
  }, [hackathonId]);

  const load = useCallback(async () => {
    if (!activeId) return;
    setIsLoading(true);
    setError(null);
    try {
      setRows(
        await listMembers(activeId, {
          search: search.trim() || undefined,
        }),
      );
    } catch (err) {
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setIsLoading(false);
    }
  }, [activeId, search, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAdd() {
    if (!userId.trim()) return;
    setBusyId("add");
    setError(null);
    try {
      await addMember(activeId, {
        user: userId.trim(),
        player_label: playerLabel.trim() || undefined,
      });
      setUserId("");
      setPlayerLabel("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setBusyId(null);
    }
  }

  async function onCreateUser() {
    setBusyId("create");
    setError(null);
    try {
      await createEventUser(activeId, createForm);
      setShowCreate(false);
      setCreateForm({
        email: "",
        username: "",
        password: "",
        name: "",
        last_name: "",
        player_label: "",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setBusyId(null);
    }
  }

  async function onBlock(row: EventMember) {
    const reason = window.prompt("Block reason", "Blocked in HAS admin");
    if (reason == null) return;
    setBusyId(row.id);
    try {
      await blockMember(activeId, row.id, reason);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to block");
    } finally {
      setBusyId(null);
    }
  }

  async function onUnblock(row: EventMember) {
    setBusyId(row.id);
    try {
      await unblockMember(activeId, row.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unblock");
    } finally {
      setBusyId(null);
    }
  }

  async function onRemove(row: EventMember) {
    if (!window.confirm("Remove this member from the event?")) return;
    setBusyId(row.id);
    try {
      await removeMember(activeId, row.id);
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
        title="Members"
        description="Users attached to this hackathon. Event-level block only."
        actions={
          <>
            <Button variant="secondary" onClick={() => void load()}>
              Refresh
            </Button>
            <Button variant="secondary" onClick={() => setShowCreate((v) => !v)}>
              {showCreate ? "Hide create" : "Create user"}
            </Button>
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
          placeholder="Name, email…"
        />
        <div className="flex items-end">
          <Button className="w-full" variant="secondary" onClick={() => void load()}>
            Apply
          </Button>
        </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
        <TextField
          label="Add existing user (UUID)"
          name="user"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <TextField
          label="Player label"
          name="player_label"
          value={playerLabel}
          onChange={(e) => setPlayerLabel(e.target.value)}
        />
        <div className="flex items-end">
          <Button
            className="w-full"
            disabled={busyId === "add" || !userId.trim()}
            onClick={() => void onAdd()}
          >
            Add member
          </Button>
        </div>
        </div>

      {showCreate ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["email", "Email"],
              ["username", "Username"],
              ["password", "Password"],
              ["name", "First name"],
              ["last_name", "Last name"],
              ["player_label", "Player label"],
            ] as const
          ).map(([key, label]) => (
            <TextField
              key={key}
              label={label}
              name={key}
              type={key === "password" ? "password" : "text"}
              value={createForm[key]}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, [key]: e.target.value }))
              }
            />
          ))}
          <div className="flex items-end sm:col-span-3">
            <Button
              disabled={
                busyId === "create" ||
                !createForm.email ||
                !createForm.username ||
                !createForm.password
              }
              onClick={() => void onCreateUser()}
            >
              Create & attach
            </Button>
          </div>
        </div>
      ) : null}
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
        emptyMessage="No members for this event."
        columns={[
          {
            key: "user",
            header: "User",
            render: (row) => (
              <div>
                <div className="font-medium">
                  {row.user_detail?.name ||
                    row.user_detail?.username ||
                    row.user}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {row.user_detail?.email || row.user}
                </div>
              </div>
            ),
          },
          {
            key: "label",
            header: "Label",
            render: (row) => row.player_label || "—",
          },
          {
            key: "status",
            header: "Status",
            render: (row) =>
              row.is_blocked ? (
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
            render: (row) => (
              <div className="flex flex-wrap justify-end gap-2">
                {row.is_blocked ? (
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
                  Remove
                </Button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
