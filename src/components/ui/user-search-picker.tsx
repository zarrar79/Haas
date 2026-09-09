"use client";

import { useCallback, useEffect, useState } from "react";

import { SearchPicker } from "@/components/ui/search-picker";
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
    <SearchPicker
      title={label}
      searchLabel="Search users"
      searchName="user_search"
      searchPlaceholder="Username, email, name…"
      search={search}
      onSearchChange={setSearch}
      onSearch={() => void runSearch(search)}
      isSearching={isSearching}
      disabled={disabled}
      emptyHint={
        multiple
          ? "Search and add one or more users to administer this event."
          : "Search and select a user."
      }
      emptyResults="No users found."
      selected={selectedUsers}
      results={results}
      isSelected={(user) => selectedIds.includes(user.id)}
      onAdd={addUser}
      onRemove={(user) => removeUser(user.id)}
      getLabel={userLabel}
      getSubtitle={(user) => user.email || user.id}
    />
  );
}
