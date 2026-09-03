"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { PageHeader } from "@/components/ui/page-header";
import { StickyToolbar } from "@/components/ui/sticky-toolbar";
import { TextField } from "@/components/ui/text-field";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import {
  UserSearchCombobox,
} from "@/components/ui/user-assign-dropdown";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import { HackathonUserAssignmentSection } from "@/features/hackathons/hackathon-user-assignment-section";
import {
  assignHackathonAdmin,
  listHackathonAdmins,
  revokeHackathonAdmin,
  type HackathonAdminBinding,
} from "@/features/hackathon-admins/hackathon-admin-api";
import { createHackathon, listHackathons } from "@/features/hackathons/hackathon-api";
import {
  listSystemUsers,
  type SystemUser,
} from "@/features/system/system-api";
import { userLabel } from "@/lib/assigned-events";
import { filterStaffProvisionedUsers } from "@/lib/user-creator";
import { ApiRequestError } from "@/lib/client-api";
import type { Hackathon } from "@/types/hackathon";

type Tab = "create" | "assignments" | "by-user";

function toIsoLocal(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

export function EventProvisioningView() {
  const { confirm } = usePlatformDialog();
  const router = useRouter();
  const { isRoot, isLoading: accessLoading } = useHaasAccess();
  const [tab, setTab] = useState<Tab>("create");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Create & assign
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [startDatetime, setStartDatetime] = useState("");
  const [endDatetime, setEndDatetime] = useState("");
  const [isInfinite, setIsInfinite] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [assigneeUsers, setAssigneeUsers] = useState<SystemUser[]>([]);
  const [allUsers, setAllUsers] = useState<SystemUser[]>([]);

  // Assignments table
  const [bindings, setBindings] = useState<HackathonAdminBinding[]>([]);
  const [bindingsLoading, setBindingsLoading] = useState(false);
  const [quickUserId, setQuickUserId] = useState("");
  const [quickHackathonId, setQuickHackathonId] = useState("");
  const [allHackathons, setAllHackathons] = useState<Hackathon[]>([]);

  // By user
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<SystemUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [userBindings, setUserBindings] = useState<HackathonAdminBinding[]>([]);
  const [togglingHackathonId, setTogglingHackathonId] = useState<string | null>(
    null,
  );

  const loadBindings = useCallback(async () => {
    setBindingsLoading(true);
    try {
      const [rows, events] = await Promise.all([
        listHackathonAdmins(),
        listHackathons({ show_deleted: "false" }),
      ]);
      setBindings(rows);
      setAllHackathons(events.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assignments");
    } finally {
      setBindingsLoading(false);
    }
  }, []);

  const loadUserBindings = useCallback(async (userId: string) => {
    try {
      const rows = await listHackathonAdmins({ user: userId, is_active: "true" });
      setUserBindings(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user assignments");
    }
  }, []);

  useEffect(() => {
    if (tab === "assignments" || tab === "by-user" || tab === "create") {
      void loadBindings();
    }
    if (tab === "assignments" || tab === "create") {
      void listSystemUsers({ has_created_by: "true" })
        .then((rows) => setAllUsers(filterStaffProvisionedUsers(rows)))
        .catch(() => setAllUsers([]));
    }
  }, [tab, loadBindings]);

  useEffect(() => {
    if (tab !== "by-user") return;
    void (async () => {
      try {
        const rows = await listSystemUsers({
          search: userSearch.trim() || undefined,
          has_created_by: "true",
        });
        setUserResults(filterStaffProvisionedUsers(rows));
      } catch {
        setUserResults([]);
      }
    })();
  }, [tab, userSearch]);

  useEffect(() => {
    if (selectedUser) void loadUserBindings(selectedUser.id);
  }, [selectedUser, loadUserBindings]);

  async function onCreateAndAssign(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    const assignUserIds = assigneeIds;
    if (assignUserIds.length === 0) {
      setError("Select at least one user to assign as event admin.");
      return;
    }

    if (!isInfinite && (!startDatetime || !endDatetime)) {
      setError("Start and end are required for timed events.");
      return;
    }

    setBusy(true);
    try {
      const created = await createHackathon({
        name,
        display_name: displayName || name,
        description,
        city: null,
        is_infinite: isInfinite,
        is_active: isActive,
        view_on_dashboard: false,
        discord_link: "",
        organizer_id: assignUserIds[0],
        ...(isInfinite
          ? {}
          : {
              start_datetime: toIsoLocal(startDatetime),
              end_datetime: toIsoLocal(endDatetime),
            }),
      });

      await Promise.all(
        assignUserIds.map((userId) =>
          assignHackathonAdmin({
            user: userId,
            hackathon: created.id,
            notes: "Assigned via event provisioning",
          }),
        ),
      );

      setInfo(
        `Created "${created.display_name || created.name}" and assigned ${assignUserIds.length} admin(s).`,
      );
      setName("");
      setDisplayName("");
      setDescription("");
      setStartDatetime("");
      setEndDatetime("");
      setAssigneeIds([]);
      setAssigneeUsers([]);
      setTab("assignments");
      await loadBindings();
    } catch (err) {
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function onQuickAssign() {
    if (!quickUserId || !quickHackathonId.trim()) {
      setError("User and hackathon are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await assignHackathonAdmin({
        user: quickUserId,
        hackathon: quickHackathonId.trim(),
      });
      setQuickUserId("");
      setInfo("Assignment created.");
      await loadBindings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRevoke(bindingId: string) {
    const ok = await confirm({
      title: "Revoke assignment",
      message: "Revoke this hackathon admin assignment?",
      confirmLabel: "Revoke",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await revokeHackathonAdmin(bindingId);
      setInfo("Assignment revoked.");
      await loadBindings();
      if (selectedUser) await loadUserBindings(selectedUser.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed");
    } finally {
      setBusy(false);
    }
  }

  async function onToggleUserHackathon(hackathonId: string, checked: boolean) {
    if (!selectedUser) return;
    setTogglingHackathonId(hackathonId);
    setError(null);
    try {
      if (checked) {
        await assignHackathonAdmin({
          user: selectedUser.id,
          hackathon: hackathonId,
        });
      } else {
        const binding = userBindings.find((b) => b.hackathon === hackathonId);
        if (binding) await revokeHackathonAdmin(binding.id);
      }
      await loadUserBindings(selectedUser.id);
      if (tab === "assignments") await loadBindings();
      setInfo(checked ? "Event assigned." : "Event unassigned.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setTogglingHackathonId(null);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "create", label: "Create & assign" },
    { id: "assignments", label: "All assignments" },
    { id: "by-user", label: "By user" },
  ];

  const assignedHackathonIds = new Set(userBindings.map((b) => b.hackathon));

  if (!accessLoading && !isRoot) {
    return (
      <div className="w-full">
        <PageHeader eyebrow="Platform" title="Event provisioning" />
        <Alert variant="error">
          Only platform Root can create hackathons and assign event admins.
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Platform"
        title="Event provisioning"
        actions={
          <Link href="/system/stats">
            <Button variant="secondary">System console</Button>
          </Link>
        }
      />

      <StickyToolbar layout="plain">
        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant={tab === item.id ? "primary" : "secondary"}
              onClick={() => {
                setTab(item.id);
                setError(null);
                setInfo(null);
              }}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </StickyToolbar>

      {error ? (
        <div className="mb-3">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}
      {info ? (
        <div className="mb-3">
          <Alert variant="success">{info}</Alert>
        </div>
      ) : null}

      {tab === "create" ? (
        <form
          onSubmit={onCreateAndAssign}
          className="grid gap-5 lg:grid-cols-2"
        >
          <div className="space-y-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Event details
            </h2>
            <TextField
              label="Name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              label="Display name"
              name="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
              <span className="font-medium text-[var(--text)]">Description</span>
              <textarea
                className="min-h-20 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text)]">
              <input
                type="checkbox"
                checked={isInfinite}
                onChange={(e) => setIsInfinite(e.target.checked)}
              />
              Infinite event (no fixed schedule)
            </label>
            {!isInfinite ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Start"
                  name="start"
                  type="datetime-local"
                  required
                  value={startDatetime}
                  onChange={(e) => setStartDatetime(e.target.value)}
                />
                <TextField
                  label="End"
                  name="end"
                  type="datetime-local"
                  required
                  value={endDatetime}
                  onChange={(e) => setEndDatetime(e.target.value)}
                />
              </div>
            ) : null}
            <label className="flex items-center gap-2 text-sm text-[var(--text)]">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active
            </label>
            <Button type="submit" disabled={busy} className="w-full sm:w-auto">
              {busy ? "Creating…" : "Create hackathon & assign"}
            </Button>
          </div>

          <HackathonUserAssignmentSection
            selectedIds={assigneeIds}
            selectedUsers={assigneeUsers}
            onChange={(ids, users) => {
              setAssigneeIds(ids);
              setAssigneeUsers(users);
            }}
            disabled={busy}
          />
        </form>
      ) : null}

      {tab === "assignments" ? (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-3">
            <UserSearchCombobox
              users={allUsers}
              value={quickUserId}
              onChange={setQuickUserId}
              label="User"
              placeholder="Search user…"
            />
            <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
              <span className="font-medium text-[var(--text)]">Hackathon</span>
              <select
                className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
                value={quickHackathonId}
                onChange={(e) => setQuickHackathonId(e.target.value)}
              >
                <option value="">Select event…</option>
                {allHackathons.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.display_name || h.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <Button
                className="w-full"
                disabled={busy}
                onClick={() => void onQuickAssign()}
              >
                Quick assign
              </Button>
            </div>
          </div>

          <DataTable
            isLoading={bindingsLoading}
            rows={bindings}
            rowKey={(r) => r.id}
            emptyMessage="No hackathon admin assignments yet."
            columns={[
              {
                key: "user",
                header: "User",
                render: (r) =>
                  userLabel(r.user_detail) !== "—"
                    ? userLabel(r.user_detail)
                    : r.user,
              },
              {
                key: "event",
                header: "Event",
                render: (r) =>
                  r.hackathon_detail?.name || r.hackathon,
              },
              {
                key: "granted",
                header: "Granted",
                render: (r) => r.granted_at || "—",
              },
              {
                key: "active",
                header: "Status",
                render: (r) =>
                  r.is_active === false ? (
                    <Badge>Inactive</Badge>
                  ) : (
                    <Badge tone="success">Active</Badge>
                  ),
              },
              {
                key: "actions",
                header: "",
                className: "text-right w-12",
                render: (r) => (
                  <RowActionsMenu
                    label="Assignment actions"
                    items={[
                      {
                        id: "open",
                        label: "Open event",
                        href: `/events/${r.hackathon}`,
                      },
                      {
                        id: "revoke",
                        label: "Revoke",
                        disabled: busy,
                        destructive: true,
                        onClick: () => void onRevoke(r.id),
                      },
                    ]}
                  />
                ),
              },
            ]}
          />
        </div>
      ) : null}

      {tab === "by-user" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(240px,1fr)_2fr]">
          <div className="space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Select user
            </h2>
            <TextField
              label="Search"
              name="by_user_search"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Name, email…"
            />
            <ul className="max-h-[420px] space-y-1 overflow-y-auto">
              {userResults.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    className={`w-full rounded-[var(--radius-sm)] px-2 py-2 text-left text-sm transition hover:bg-[var(--surface-hover)] ${
                      selectedUser?.id === user.id
                        ? "bg-[var(--accent-muted)] ring-1 ring-[var(--accent)]/30"
                        : ""
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <span className="font-medium">{userLabel(user)}</span>
                    <span className="block text-xs text-[var(--text-muted)]">
                      {user.email}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            {selectedUser ? (
              <div className="space-y-3">
                <div>
                  <h2 className="text-sm font-bold text-[var(--text)]">
                    Events for {userLabel(selectedUser)}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Toggle events this user can administer. They will only see
                    checked events after login.
                  </p>
                </div>
                <ul className="max-h-[480px] space-y-2 overflow-y-auto">
                  {allHackathons.map((h) => {
                    const checked = assignedHackathonIds.has(h.id);
                    return (
                      <li
                        key={h.id}
                        className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2"
                      >
                        <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={togglingHackathonId === h.id}
                            onChange={(e) =>
                              void onToggleUserHackathon(h.id, e.target.checked)
                            }
                          />
                          <span>
                            <span className="font-medium text-[var(--text)]">
                              {h.display_name || h.name}
                            </span>
                            {!h.is_active ? (
                              <Badge>Inactive</Badge>
                            ) : null}
                          </span>
                        </label>
                        {checked ? (
                          <Link href={`/events/${h.id}`}>
                            <Button size="sm" variant="ghost">
                              Preview
                            </Button>
                          </Link>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-[var(--text-muted)]">
                Select a user to manage their hackathon assignments.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
