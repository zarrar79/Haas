"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { StaffUserCreateForm } from "@/components/ui/staff-user-create-form";
import { userLabel } from "@/lib/assigned-events";
import {
  filterStaffProvisionedUsers,
  staffCreatorLabel,
} from "@/lib/user-creator";
import { ListSkeleton } from "@/components/ui/skeleton";
import { listSystemUsers, type SystemUser } from "@/features/system/system-api";

type Props = {
  selectedIds: string[];
  selectedUsers?: SystemUser[];
  onChange: (ids: string[], users: SystemUser[]) => void;
  disabled?: boolean;
  label?: string;
};

function userHaystack(user: SystemUser): string {
  return [user.username, user.email, user.name, user.last_name, user.user_type, userLabel(user)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function UserSearchAddPicker({
  selectedIds,
  selectedUsers: selectedUsersProp = [],
  onChange,
  disabled = false,
  label = "Event administrators",
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [knownUsers, setKnownUsers] = useState<SystemUser[]>(selectedUsersProp);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadUsers = useCallback(async (search?: string) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const rows = await listSystemUsers({
        search: search?.trim() || undefined,
        has_created_by: "true",
      });
      setUsers(filterStaffProvisionedUsers(rows));
    } catch {
      setLoadError("Could not load users.");
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUsersProp.length === 0) return;
    setKnownUsers((prev) => {
      const byId = new Map(prev.map((u) => [u.id, u]));
      for (const user of selectedUsersProp) byId.set(user.id, user);
      return [...byId.values()];
    });
  }, [selectedUsersProp]);

  useEffect(() => {
    if (!open) return;
    void loadUsers();
    window.setTimeout(() => searchRef.current?.focus(), 0);
  }, [open, loadUsers]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void loadUsers(query);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, open, loadUsers]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const selectedUsers = useMemo(() => {
    const byId = new Map<string, SystemUser>();
    for (const user of [...knownUsers, ...users]) byId.set(user.id, user);
    return selectedIds.map((id) => byId.get(id)).filter(Boolean) as SystemUser[];
  }, [selectedIds, knownUsers, users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = users.filter((u) => !selectedIds.includes(u.id));
    if (!q) return pool;
    return pool.filter((u) => userHaystack(u).includes(q));
  }, [users, query, selectedIds]);

  function addUser(user: SystemUser) {
    if (selectedIds.includes(user.id)) return;
    setKnownUsers((prev) => {
      const byId = new Map(prev.map((u) => [u.id, u]));
      byId.set(user.id, user);
      return [...byId.values()];
    });
    onChange([...selectedIds, user.id], [...selectedUsers, user]);
    setQuery("");
  }

  function removeUser(id: string) {
    onChange(
      selectedIds.filter((x) => x !== id),
      selectedUsers.filter((u) => u.id !== id),
    );
  }

  function toggleOpen() {
    if (disabled) return;
    setOpen((prev) => {
      if (prev) {
        setQuery("");
        setShowCreateForm(false);
      }
      return !prev;
    });
  }

  function handleUserCreated(user: SystemUser) {
    setKnownUsers((prev) => {
      const byId = new Map(prev.map((u) => [u.id, u]));
      byId.set(user.id, user);
      return [...byId.values()];
    });
    setUsers((prev) => {
      const byId = new Map(prev.map((u) => [u.id, u]));
      byId.set(user.id, user);
      return [...byId.values()];
    });
    addUser(user);
    setShowCreateForm(false);
  }

  return (
    <div className="space-y-3" ref={rootRef}>
      <p className="text-sm font-medium text-[var(--text)]">{label}</p>

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-left text-sm text-[var(--text-muted)] transition hover:border-[var(--border-strong)] disabled:opacity-50"
          onClick={toggleOpen}
        >
          <span>Select user to add…</span>
          <svg
            className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {open ? (
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow)]">
            <div className="border-b border-[var(--border)] p-2">
              <input
                ref={searchRef}
                type="text"
                value={query}
                placeholder="Search name, email, username…"
                className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="mt-2 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={disabled}
                  onClick={() => setShowCreateForm((v) => !v)}
                >
                  {showCreateForm ? "Hide create form" : "Create user"}
                </Button>
              </div>
            </div>

            {showCreateForm ? (
              <div className="border-b border-[var(--border)] p-2">
                <StaffUserCreateForm
                  disabled={disabled}
                  onCreated={handleUserCreated}
                />
              </div>
            ) : null}

            <ul
              className="max-h-60 overflow-y-auto py-1"
              role="listbox"
              aria-label="Users"
            >
              {isLoading && filtered.length === 0 ? (
                <li className="px-2 py-2">
                  <ListSkeleton rows={4} />
                </li>
              ) : loadError ? (
                <li className="px-3 py-3 text-center text-xs text-[var(--danger)]">
                  {loadError}
                </li>
              ) : filtered.length === 0 ? (
                <li className="px-3 py-3 text-center text-xs text-[var(--text-muted)]">
                  <p>No users found.</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    disabled={disabled}
                    onClick={() => setShowCreateForm(true)}
                  >
                    Create user
                  </Button>
                </li>
              ) : (
                filtered.map((user) => (
                  <li key={user.id} role="option">
                    <button
                      type="button"
                      className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-[var(--surface-hover)]"
                      onClick={() => addUser(user)}
                    >
                      <span className="font-medium text-[var(--text)]">
                        {userLabel(user)}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {user.email || user.username || user.id}
                        {user.user_type ? ` · ${user.user_type}` : ""}
                      </span>
                      {staffCreatorLabel(user) ? (
                        <span className="text-[0.65rem] text-[var(--text-subtle)]">
                          Created by: {staffCreatorLabel(user)}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}
      </div>

      {selectedUsers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <span
              key={user.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--text)]"
            >
              {userLabel(user)}
              <button
                type="button"
                className="text-[var(--text-muted)] hover:text-[var(--danger)]"
                disabled={disabled}
                onClick={() => removeUser(user.id)}
                aria-label={`Remove ${userLabel(user)}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">
          Only users created by an admin are listed. Open the dropdown, search if needed, click to add. Save the form to apply.
        </p>
      )}
    </div>
  );
}
