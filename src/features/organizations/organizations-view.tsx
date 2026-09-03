"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { ListPageStat, ListPageStats } from "@/components/ui/list-page-stats";
import { FilterSelect, StickyToolbar } from "@/components/ui/sticky-toolbar";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { HackathonPicker } from "@/features/events/hackathon-picker";
import {
  listOrganizations,
  type Organization,
} from "@/features/organizations/organization-api";
import { OrganizationFormModal } from "@/features/organizations/organization-form-modal";
import { ApiRequestError } from "@/lib/client-api";

type ActiveFilter = "all" | "active" | "inactive";

export function OrganizationsView() {
  const router = useRouter();
  const [hackathonId, setHackathonId] = useState("");
  const [rows, setRows] = useState<Organization[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [shownCount, setShownCount] = useState(0);
  const onPaginationInfo = useCallback((info: { shown: number }) => {
    setShownCount(info.shown);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!hackathonId) {
      setRows([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setRows(
        await listOrganizations({
          hackathon: hackathonId,
          search: debouncedSearch || undefined,
          is_active:
            activeFilter === "active"
              ? "true"
              : activeFilter === "inactive"
                ? "false"
                : undefined,
        }),
      );
    } catch (err) {
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        router.replace("/login");
        return;
      }
      setError(
        err instanceof Error ? err.message : "Failed to load organizations",
      );
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId, debouncedSearch, activeFilter, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => rows, [rows]);

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Platform"
        title="Organizations"
        description="Organizations belong to a hackathon. Select an event, then create or edit orgs."
        actions={
          <>
            <Button
              size="sm"
              disabled={!hackathonId}
              onClick={() => {
                setModalMode("create");
                setEditingId(null);
                setModalOpen(true);
              }}
            >
              Create organization
            </Button>
          </>
        }
      />

      <StickyToolbar
        footer={
          <ListPageStats>
            <ListPageStat label="Total" value={filtered.length} />
            <ListPageStat label="Shown" value={shownCount} />
          </ListPageStats>
        }
      >
        <HackathonPicker
          value={hackathonId}
          onChange={setHackathonId}
          navigateOnChange={false}
          emptyLabel="Select hackathon…"
          className="min-w-[180px]"
        />
        <label className="flex min-w-[11rem] flex-1 flex-col gap-1 text-xs text-[var(--text-muted)] sm:max-w-xs">
          <span className="font-medium text-[var(--text)]">Search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Organization name…"
            className="rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--input-bg)] px-2 py-2 text-sm text-[var(--text)] outline-none"
          />
        </label>
        <FilterSelect
          label="Status"
          value={activeFilter}
          onChange={(v) => setActiveFilter(v as ActiveFilter)}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </FilterSelect>
      </StickyToolbar>

      {error ? (
        <div className="mb-3">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      {!hackathonId ? (
        <Alert variant="info">Select a hackathon to manage its organizations.</Alert>
      ) : (
        <DataTable
          isLoading={isLoading}
          rows={filtered}
          rowKey={(r) => r.id}
          onPaginationInfo={onPaginationInfo}
          emptyMessage="No organizations for this hackathon yet."
          columns={[
            {
              key: "name",
              header: "Organization",
              render: (row) => (
                <div className="flex items-center gap-3">
                  <Avatar
                    src={row.media_url}
                    name={row.name}
                    size="sm"
                    rounded="md"
                  />
                  <div>
                    <div className="font-medium">{row.name}</div>
                    <div className="max-w-md truncate text-xs text-[var(--text-muted)]">
                      {row.description || "—"}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (row) =>
                row.is_active === false ? (
                  <Badge>Inactive</Badge>
                ) : (
                  <Badge tone="success">Active</Badge>
                ),
            },
            {
              key: "actions",
              header: "",
              className: "text-right w-12",
              render: (row) => (
                <RowActionsMenu
                  items={[
                    {
                      id: "edit",
                      label: "Edit",
                      onClick: () => {
                        setModalMode("edit");
                        setEditingId(row.id);
                        setModalOpen(true);
                      },
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      )}

      {hackathonId ? (
        <OrganizationFormModal
          open={modalOpen}
          mode={modalMode}
          hackathonId={hackathonId}
          organizationId={editingId}
          onClose={() => setModalOpen(false)}
          onSaved={() => void load()}
        />
      ) : null}
    </div>
  );
}
