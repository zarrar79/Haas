"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ModalShell } from "@/components/ui/modal-shell";
import { TextField } from "@/components/ui/text-field";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import {
  createPlatformGroup,
  listPermissions,
  listPlatformGroups,
  type HaasGroup,
  type HaasPermission,
} from "@/features/groups/group-api";
import { ApiRequestError } from "@/lib/client-api";

export function SystemGroupsView() {
  const router = useRouter();
  const { isRoot } = useHaasAccess();
  const [groups, setGroups] = useState<HaasGroup[]>([]);
  const [permissions, setPermissions] = useState<HaasPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [permSearch, setPermSearch] = useState("");
  const [selectedPermIds, setSelectedPermIds] = useState<number[]>([]);
  const [createBusy, setCreateBusy] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setGroups(await listPlatformGroups());
    } catch (err) {
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load groups");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!createOpen) return;
    void (async () => {
      try {
        setPermissions(await listPermissions());
      } catch {
        setPermissions([]);
      }
    })();
  }, [createOpen]);

  async function handleCreate() {
    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }
    setCreateBusy(true);
    setError(null);
    try {
      await createPlatformGroup({
        name: name.trim(),
        permission_ids: selectedPermIds,
      });
      setCreateOpen(false);
      setName("");
      setSelectedPermIds([]);
      setPermSearch("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreateBusy(false);
    }
  }

  function togglePerm(id: number) {
    setSelectedPermIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  const filteredPerms = permissions.filter((p) => {
    const q = permSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (p.codename || "").toLowerCase().includes(q) ||
      (p.name || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--text-muted)]">
          Platform permission groups for HigherStaff and custom roles.
        </p>
        {isRoot ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            Create group
          </Button>
        ) : null}
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <DataTable
        isLoading={isLoading}
        rows={groups}
        rowKey={(r) => String(r.id)}
        emptyMessage="No platform groups."
        columns={[
          { key: "name", header: "Name", render: (r) => r.name },
          {
            key: "members",
            header: "Members",
            render: (r) => String(r.user_count ?? r.users?.length ?? 0),
          },
          {
            key: "perms",
            header: "Permissions",
            render: (r) => String(r.permissions?.length ?? 0),
          },
          {
            key: "desc",
            header: "Description",
            render: (r) => r.description || "—",
          },
        ]}
      />

      <ModalShell
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        panelClassName="max-w-xl"
        ariaLabel="Create permission group"
      >
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-lg font-bold text-[var(--text)]">
            Create permission group
          </h2>
        </div>
        <div className="space-y-4 px-5 py-4">
          <TextField
            label="Group name"
            name="group_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Challenge editors"
            disabled={createBusy}
          />
          <TextField
            label="Filter permissions"
            name="perm_search"
            value={permSearch}
            onChange={(e) => setPermSearch(e.target.value)}
            disabled={createBusy}
          />
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border)] p-2">
            {filteredPerms.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-[var(--text-muted)]">
                No permissions match.
              </p>
            ) : (
              filteredPerms.map((perm) => (
                <label
                  key={perm.id}
                  className="flex cursor-pointer items-start gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm hover:bg-[var(--surface-hover)]"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selectedPermIds.includes(perm.id)}
                    onChange={() => togglePerm(perm.id)}
                    disabled={createBusy}
                  />
                  <span>
                    <span className="font-medium text-[var(--text)]">
                      {perm.codename}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                      {perm.name}
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
          <Button disabled={createBusy} onClick={() => void handleCreate()}>
            {createBusy ? "Creating…" : "Create group"}
          </Button>
        </div>
      </ModalShell>
    </div>
  );
}
