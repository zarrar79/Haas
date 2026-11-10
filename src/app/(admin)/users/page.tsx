"use client";

import { PageHeader } from "@/components/ui/page-header";
import { SystemUsersView } from "@/features/system/system-users-view";

/** Platform-level Users: every user on the platform, for system administrators. */
export default function UsersPage() {
  return (
    <div className="w-full">
      <PageHeader eyebrow="Platform" title="Users" />
      <SystemUsersView />
    </div>
  );
}
