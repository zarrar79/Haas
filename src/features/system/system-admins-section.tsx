"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { TextField } from "@/components/ui/text-field";
import { UserSearchPicker } from "@/components/ui/user-search-picker";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import { HackathonPicker } from "@/features/events/hackathon-picker";
import {
  grantSystemAdmin,
  listSystemAdmins,
  revokeSystemAdmin,
  type SystemAdmin,
} from "@/features/system/system-api";
import { ApiRequestError } from "@/lib/client-api";

export function SystemAdminsSection() {
  const router = useRouter();
  const { confirm } = usePlatformDialog();
  const [admins, setAdmins] = useState<SystemAdmin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminUserId, setAdminUserId] = useState("");
  const [adminHackathonId, setAdminHackathonId] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setAdmins(await listSystemAdmins());
    } catch (err) {
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load event admins");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onGrantAdmin() {
    if (!adminUserId || !adminHackathonId) {
      setError("Select a user and hackathon.");
      return;
    }
    setBusyId("grant");
    setError(null);
    try {
      await grantSystemAdmin({
        user: adminUserId,
        hackathon: adminHackathonId,
        notes: adminNotes.trim() || undefined,
      });
      setAdminUserId("");
      setAdminHackathonId("");
      setAdminNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onRevokeAdmin(id: string) {
    const ok = await confirm({
      title: "Revoke event admin",
      message: "Revoke this hackathon administrator binding?",
      confirmLabel: "Revoke",
      destructive: true,
    });
    if (!ok) return;
    setBusyId(id);
    try {
      await revokeSystemAdmin(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Alert variant="info">
        Assign a user as main administrator for a hackathon. HigherStaff and Root
        can create and revoke event admin bindings.
      </Alert>

      <div className="grid gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 lg:grid-cols-2">
        <HackathonPicker
          value={adminHackathonId}
          onChange={setAdminHackathonId}
          navigateOnChange={false}
        />
        <UserSearchPicker
          label="Event admin user"
          multiple={false}
          selectedIds={adminUserId ? [adminUserId] : []}
          onChange={(ids) => setAdminUserId(ids[0] || "")}
        />
        <TextField
          label="Notes"
          name="notes"
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
        />
        <div className="flex items-end">
          <Button
            className="w-full"
            disabled={busyId === "grant"}
            onClick={() => void onGrantAdmin()}
          >
            Assign event admin
          </Button>
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <DataTable
        isLoading={isLoading}
        rows={admins}
        rowKey={(r) => r.id}
        emptyMessage="No event admin bindings."
        columns={[
          {
            key: "user",
            header: "User",
            render: (r) =>
              r.user_detail?.username ||
              r.user_detail?.email ||
              r.user ||
              "—",
          },
          {
            key: "hackathon",
            header: "Hackathon",
            render: (r) => r.hackathon_name || r.hackathon || "—",
          },
          { key: "notes", header: "Notes", render: (r) => r.notes || "—" },
          {
            key: "status",
            header: "Status",
            render: (r) =>
              r.is_active === false ? (
                <Badge tone="warning">Revoked</Badge>
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
                label="Admin actions"
                items={[
                  {
                    id: "revoke",
                    label: "Revoke",
                    disabled: busyId === r.id,
                    destructive: true,
                    onClick: () => void onRevokeAdmin(r.id),
                  },
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
