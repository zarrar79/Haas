"use client";

import { useMemo, useState } from "react";

import { userLabel } from "@/lib/assigned-events";
import { staffCreatorLabel } from "@/lib/user-creator";
import type { SystemUser } from "@/features/system/system-api";

type ComboboxProps = {
  users: SystemUser[];
  value: string;
  onChange: (userId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  required?: boolean;
  excludeIds?: string[];
};

export function UserSearchCombobox({
  users,
  value,
  onChange,
  disabled = false,
  placeholder = "Search by name, email, username…",
  label = "Select user",
  required = false,
  excludeIds = [],
}: ComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = users.find((u) => u.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = users.filter((u) => !excludeIds.includes(u.id));
    if (!q) return pool.slice(0, 40);
    return pool
      .filter((u) => {
        const hay = [
          u.username,
          u.email,
          u.name,
          u.last_name,
          u.user_type,
          userLabel(u),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 40);
  }, [users, query, excludeIds]);

  return (
    <div className="relative">
      <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
        <span className="font-medium text-[var(--text)]">
          {label}
          {required ? " *" : ""}
        </span>
        <input
          type="text"
          className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
          placeholder={selected ? userLabel(selected) : placeholder}
          value={query}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        />
      </label>
      {open && !disabled ? (
        <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow)]">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-[var(--text-muted)]">
              No users match your search.
            </li>
          ) : (
            filtered.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-[var(--surface-hover)]"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(user.id);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <span className="font-medium text-[var(--text)]">
                    {userLabel(user)}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {user.email || user.id}
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
      ) : null}
    </div>
  );
}

export function collectAssigneeIds(
  primaryUserId: string,
  additionalUserIds: string[],
): string[] {
  const ids = [primaryUserId, ...additionalUserIds].filter(Boolean);
  return [...new Set(ids)];
}
