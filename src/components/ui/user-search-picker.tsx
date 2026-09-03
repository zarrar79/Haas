"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { listSystemUsers, type SystemUser } from "@/features/system/system-api";
import { userLabel } from "@/lib/assigned-events";

type Props = {
  selectedIds: string[];
  onChange: (ids: string[], users: SystemUser[]) => void;
  multiple?: boolean;
  label?: string;
  disabled?: boolean;
};

export function UserSearchPicker({
  selectedIds,
  onChange,
  multiple = true,
  label = "Assign users",
  disabled = false,
}: Props) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SystemUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<SystemUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    setIsSearching(true);
    try {
      const rows = await listSystemUsers({ search: q.trim() || undefined });
      setResults(rows);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    void runSearch("");
  }, [runSearch]);

  useEffect(() => {
    if (selectedIds.length === 0) {
      setSelectedUsers([]);
    }
  }, [selectedIds]);

  function addUser(user: SystemUser) {
    if (selectedIds.includes(user.id)) return;
    const nextUsers = multiple ? [...selectedUsers, user] : [user];
    const nextIds = nextUsers.map((u) => u.id);
    setSelectedUsers(nextUsers);
    onChange(nextIds, nextUsers);
  }

  function removeUser(id: string) {
    const nextUsers = selectedUsers.filter((u) => u.id !== id);
    onChange(
      nextUsers.map((u) => u.id),
      nextUsers,
    );
    setSelectedUsers(nextUsers);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-[var(--text)]">{label}</p>
      <div className="flex flex-wrap gap-2">
        <TextField
          label="Search users"
          name="user_search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Username, email, name…"
          disabled={disabled}
        />
        <div className="flex items-end">
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || isSearching}
            onClick={() => void runSearch(search)}
          >
            {isSearching ? "Searching…" : "Search"}
          </Button>
        </div>
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
          {multiple
            ? "Search and add one or more users to administer this event."
            : "Search and select a user."}
        </p>
      )}

      <ul className="max-h-48 space-y-1 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] p-2">
        {results.length === 0 ? (
          <li className="px-2 py-3 text-center text-xs text-[var(--text-muted)]">
            No users found.
          </li>
        ) : (
          results.map((user) => {
            const picked = selectedIds.includes(user.id);
            return (
              <li key={user.id}>
                <button
                  type="button"
                  disabled={disabled || picked}
                  className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2 py-2 text-left text-sm transition hover:bg-[var(--surface-hover)] ${
                    picked ? "opacity-50" : ""
                  }`}
                  onClick={() => addUser(user)}
                >
                  <span>
                    <span className="font-medium text-[var(--text)]">
                      {userLabel(user)}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                      {user.email || user.id}
                    </span>
                  </span>
                  {picked ? (
                    <span className="text-xs text-[var(--text-muted)]">Added</span>
                  ) : (
                    <span className="text-xs text-[var(--accent)]">Add</span>
                  )}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
