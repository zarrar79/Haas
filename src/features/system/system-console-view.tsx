"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StickyToolbar } from "@/components/ui/sticky-toolbar";
import { TextField } from "@/components/ui/text-field";
import {
  blockSystemUser,
  getSystemStats,
  grantSystemAdmin,
  listSystemActivity,
  listSystemAdmins,
  listSystemAudit,
  listSystemUsers,
  revokeSystemAdmin,
  unblockSystemUser,
  type SystemAdmin,
  type SystemStats,
  type SystemUser,
} from "@/features/system/system-api";
import { listPlatformGroups } from "@/features/groups/group-api";
import { ApiRequestError } from "@/lib/client-api";

type Section = "stats" | "users" | "admins" | "audit" | "activity" | "groups";

type Props = { section?: string };

export function SystemConsoleView({ section }: Props) {
  const router = useRouter();
  const active: Section =
    section === "users" ||
    section === "admins" ||
    section === "audit" ||
    section === "activity" ||
    section === "groups"
      ? section
      : "stats";

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [admins, setAdmins] = useState<SystemAdmin[]>([]);
  const [audit, setAudit] = useState<Record<string, unknown>[]>([]);
  const [activity, setActivity] = useState<Record<string, unknown>[]>([]);
  const [groups, setGroups] = useState<
    Array<{ id: string | number; name: string; description?: string }>
  >([]);
  const [search, setSearch] = useState("");
  const [adminUserId, setAdminUserId] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (active === "stats") setStats(await getSystemStats());
      if (active === "users")
        setUsers(await listSystemUsers({ search: search.trim() || undefined }));
      if (active === "admins") setAdmins(await listSystemAdmins());
      if (active === "audit") setAudit(await listSystemAudit());
      if (active === "activity") setActivity(await listSystemActivity());
      if (active === "groups") setGroups(await listPlatformGroups());
    } catch (err) {
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load system data");
    } finally {
      setIsLoading(false);
    }
  }, [active, search, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onBlock(user: SystemUser) {
    const reason = window.prompt("Global block reason", "Blocked in HAS");
    if (reason == null) return;
    setBusyId(user.id);
    try {
      await blockSystemUser(user.id, reason);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Block failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onUnblock(user: SystemUser) {
    setBusyId(user.id);
    try {
      await unblockSystemUser(user.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unblock failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onGrantAdmin() {
    if (!adminUserId.trim()) return;
    setBusyId("grant");
    try {
      await grantSystemAdmin({
        user: adminUserId.trim(),
        notes: adminNotes.trim() || undefined,
      });
      setAdminUserId("");
      setAdminNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Grant failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onRevokeAdmin(id: string) {
    if (!window.confirm("Revoke system.admin binding?")) return;
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

  const nav = [
    { id: "stats", href: "/system/stats", label: "Stats" },
    { id: "users", href: "/system/users", label: "Users" },
    { id: "admins", href: "/system/admins", label: "Admins" },
    { id: "audit", href: "/system/audit", label: "Audit" },
    { id: "activity", href: "/system/activity", label: "Activity" },
    { id: "groups", href: "/system/groups", label: "Groups" },
  ] as const;

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Platform"
        title="System"
        description="Root / system.admin console — stats, global users, admins, audit."
        actions={
          <Button variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      <StickyToolbar layout="plain">
        <div className="flex flex-wrap gap-2">
        {nav.map((item) => (
          <Link key={item.id} href={item.href}>
            <Button
              size="sm"
              variant={active === item.id ? "primary" : "secondary"}
            >
              {item.label}
            </Button>
          </Link>
        ))}
        </div>
      </StickyToolbar>

      {error ? (
        <div className="mb-3">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      ) : null}

      {!isLoading && active === "stats" && stats ? (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Object.entries(stats).map(([key, value]) => (
            <div
              key={key}
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <p className="text-xs text-[var(--text-muted)]">{key}</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--text)]">
                {String(value ?? 0)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {!isLoading && active === "users" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <TextField
              label="Search"
              name="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex items-end">
              <Button variant="secondary" onClick={() => void load()}>
                Apply
              </Button>
            </div>
          </div>
          <DataTable
            rows={users}
            rowKey={(r) => r.id}
            emptyMessage="No users."
            columns={[
              {
                key: "user",
                header: "User",
                render: (r) => (
                  <div>
                    <div className="font-medium">
                      {r.name || r.username || r.id}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {r.email}
                    </div>
                  </div>
                ),
              },
              {
                key: "type",
                header: "Type",
                render: (r) => r.user_type || "—",
              },
              {
                key: "block",
                header: "Status",
                render: (r) =>
                  r.is_block ? (
                    <Badge tone="danger">Blocked</Badge>
                  ) : (
                    <Badge tone="success">OK</Badge>
                  ),
              },
              {
                key: "actions",
                header: "",
                className: "text-right",
                render: (r) =>
                  r.is_block ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busyId === r.id}
                      onClick={() => void onUnblock(r)}
                    >
                      Unblock
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busyId === r.id}
                      onClick={() => void onBlock(r)}
                    >
                      Block
                    </Button>
                  ),
              },
            ]}
          />
        </div>
      ) : null}

      {!isLoading && active === "admins" ? (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-3">
            <TextField
              label="User UUID"
              name="admin_user"
              value={adminUserId}
              onChange={(e) => setAdminUserId(e.target.value)}
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
                Grant system.admin
              </Button>
            </div>
          </div>
          <DataTable
            rows={admins}
            rowKey={(r) => r.id}
            emptyMessage="No system.admin bindings."
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
              { key: "notes", header: "Notes", render: (r) => r.notes || "—" },
              {
                key: "actions",
                header: "",
                className: "text-right",
                render: (r) => (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === r.id}
                    onClick={() => void onRevokeAdmin(r.id)}
                  >
                    Revoke
                  </Button>
                ),
              },
            ]}
          />
        </div>
      ) : null}

      {!isLoading && active === "audit" ? (
        <DataTable
          rows={audit}
          rowKey={(r) => String(r.id ?? JSON.stringify(r))}
          emptyMessage="No audit rows."
          columns={[
            {
              key: "action",
              header: "Action",
              render: (r) => String(r.action ?? "—"),
            },
            {
              key: "category",
              header: "Category",
              render: (r) => String(r.category ?? "—"),
            },
            {
              key: "when",
              header: "When",
              render: (r) => String(r.created_at ?? "—"),
            },
          ]}
        />
      ) : null}

      {!isLoading && active === "activity" ? (
        <DataTable
          rows={activity}
          rowKey={(r) => String(r.id ?? JSON.stringify(r))}
          emptyMessage="No activity rows."
          columns={[
            {
              key: "type",
              header: "Type",
              render: (r) => String(r.type ?? "—"),
            },
            {
              key: "message",
              header: "Message",
              render: (r) => (
                <span className="line-clamp-2 text-xs">
                  {String(r.message ?? "")}
                </span>
              ),
            },
            {
              key: "when",
              header: "When",
              render: (r) => String(r.date_time ?? r.created_at ?? "—"),
            },
          ]}
        />
      ) : null}

      {!isLoading && active === "groups" ? (
        <DataTable
          rows={groups}
          rowKey={(r) => String(r.id)}
          emptyMessage="No platform groups."
          columns={[
            { key: "name", header: "Name", render: (r) => r.name },
            {
              key: "desc",
              header: "Description",
              render: (r) => r.description || "—",
            },
          ]}
        />
      ) : null}
    </div>
  );
}
