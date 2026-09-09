"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { FormSelect } from "@/components/ui/form-fields";
import { FormSkeleton } from "@/components/ui/skeleton";
import { TextField } from "@/components/ui/text-field";
import { UserSearchAddPicker } from "@/components/ui/user-search-add-picker";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import {
  assignHackathonRole,
  getHackathonRoleCatalog,
  listHackathonRoles,
  revokeHackathonRole,
  type HackathonRoleBinding,
  type HackathonRoleCatalogItem,
  type HackathonRoleCode,
} from "@/features/roles/role-api";
import type { SystemUser } from "@/features/system/system-api";
import { redirectIfUnauthorized } from "@/lib/client-api";
import { userLabel } from "@/lib/assigned-events";

type Props = {
  hackathonId: string;
};

export function EventStaffRolesPanel({ hackathonId }: Props) {
  const router = useRouter();
  const { confirm } = usePlatformDialog();
  const { hasCapability, canMutateEvent } = useHaasAccess();
  const canGrant = hasCapability("roles.grant", hackathonId);
  const canWrite = canMutateEvent(hackathonId) && canGrant;

  const [rows, setRows] = useState<HackathonRoleBinding[]>([]);
  const [catalog, setCatalog] = useState<HackathonRoleCatalogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<SystemUser[]>([]);
  const [role, setRole] = useState<HackathonRoleCode>("hackathon.manager");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    if (!hackathonId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [bindings, roles] = await Promise.all([
        listHackathonRoles(hackathonId),
        getHackathonRoleCatalog(hackathonId),
      ]);
      setRows(bindings);
      setCatalog(roles);
      if (roles[0]?.role) setRole(roles[0].role);
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Failed to load staff roles");
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAssign() {
    if (!selectedUserIds[0]) {
      setError("Select a user to assign.");
      return;
    }
    setIsSaving(true);
    setError(null);
    setInfo(null);
    try {
      await assignHackathonRole(hackathonId, {
        user: selectedUserIds[0],
        role,
        notes: notes.trim() || undefined,
      });
      setSelectedUserIds([]);
      setSelectedUsers([]);
      setNotes("");
      setInfo("Staff role assigned. User is now staff for this event.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign failed");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRevoke(row: HackathonRoleBinding) {
    const ok = await confirm({
      title: "Revoke staff role?",
      message: `Remove ${row.role_label || row.role} from ${userLabel(row.user_detail)}.`,
      confirmLabel: "Revoke",
      destructive: true,
    });
    if (!ok) return;
    setError(null);
    try {
      await revokeHackathonRole(hackathonId, row.id);
      setInfo("Role revoked.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed");
    }
  }

  const selectedCatalog = catalog.find((c) => c.role === role);

  if (isLoading) {
    return <FormSkeleton fields={6} />;
  }

  return (
    <div className="space-y-5">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {info ? <Alert variant="success">{info}</Alert> : null}

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Assign event staff
        </h2>
        <p className="mt-1 mb-4 text-sm text-[var(--text-muted)]">
          Hackathon admins can grant Manager, Moderator, and other limited roles
          for this event only. Assignees become staff with those permissions.
        </p>

        {canWrite ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <UserSearchAddPicker
              selectedIds={selectedUserIds}
              selectedUsers={selectedUsers}
              onChange={(ids, users) => {
                setSelectedUserIds(ids);
                setSelectedUsers(users);
              }}
              multiple={false}
              allowCreate={false}
              label="User"
              disabled={isSaving}
              emptyHint="Only users created or updated by staff appear here. Open the dropdown and click to select."
            />
            <div className="space-y-3">
              <FormSelect
                label="Role"
                value={role}
                onChange={setRole}
                disabled={isSaving}
              >
                {catalog.map((item) => (
                  <option key={item.role} value={item.role}>
                    {item.label}
                  </option>
                ))}
              </FormSelect>
              <TextField
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSaving}
                placeholder="Optional"
              />
              <Button type="button" onClick={() => void handleAssign()} disabled={isSaving}>
                {isSaving ? "Assigning…" : "Assign role"}
              </Button>
            </div>
          </div>
        ) : (
          <Alert variant="info">
            You need the role-grant permission (main event admin) to assign staff.
          </Alert>
        )}

        {selectedCatalog ? (
          <div className="mt-4 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {selectedCatalog.label} can
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {(selectedCatalog.capability_labels || []).map((cap) => (
                <Badge key={cap.code}>{cap.label}</Badge>
              ))}
            </ul>
            {(role === "hackathon.manager" || role === "hackathon.moderator") && (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Static challenges and Q&amp;A only — no machines, score edits, or
                dynamic challenge creation.
              </p>
            )}
          </div>
        ) : null}
      </div>

      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        emptyMessage="No staff roles assigned yet."
        columns={[
          {
            key: "user",
            header: "User",
            render: (row) => (
              <div>
                <div className="font-medium text-[var(--text)]">
                  {userLabel(row.user_detail)}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {row.user_detail?.email || row.user}
                </div>
              </div>
            ),
          },
          {
            key: "role",
            header: "Role",
            render: (row) => <Badge>{row.role_label || row.role}</Badge>,
          },
          {
            key: "granted",
            header: "Granted",
            render: (row) =>
              row.granted_at
                ? new Date(row.granted_at).toLocaleString()
                : "—",
          },
          {
            key: "actions",
            header: "",
            render: (row) =>
              canWrite ? (
                <RowActionsMenu
                  items={[
                    {
                      id: "revoke",
                      label: "Revoke",
                      destructive: true,
                      onClick: () => void handleRevoke(row),
                    },
                  ]}
                />
              ) : null,
          },
        ]}
      />
    </div>
  );
}
