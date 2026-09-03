"use client";

import { UserSearchAddPicker } from "@/components/ui/user-search-add-picker";
import type { SystemUser } from "@/features/system/system-api";

type Props = {
  selectedIds: string[];
  selectedUsers?: SystemUser[];
  onChange: (ids: string[], users: SystemUser[]) => void;
  disabled?: boolean;
};

export function HackathonUserAssignmentSection({
  selectedIds,
  selectedUsers,
  onChange,
  disabled = false,
}: Props) {
  return (
    <UserSearchAddPicker
      selectedIds={selectedIds}
      selectedUsers={selectedUsers}
      onChange={onChange}
      disabled={disabled}
      label="Event administrators"
    />
  );
}
