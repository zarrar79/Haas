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
import { FilterSelect, FilterTextField, StickyToolbar } from "@/components/ui/sticky-toolbar";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import {
  listOrganizations,
  type Organization,
} from "@/features/organizations/organization-api";
import { OrganizationFormModal } from "@/features/organizations/organization-form-modal";
import { redirectIfUnauthorized } from "@/lib/client-api";

type Props = {
  hackathonId: string;
  /** When true, omit page chrome (used inside Hackathon tab). */
  embedded?: boolean;
};

type ActiveFilter = "all" | "active" | "inactive";

export function EventOrganizationsView({
  hackathonId,
  embedded = false,
}: Props) {
  const router = useRouter();
  const { setSelectedHackathonId } = useSelectedEvent();
  const [activeId, setActiveId] = useState(hackathonId);
  const [rows, setRows] = useState<Organization[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [shownCount, setShownCount] = useState(0);
  const onPaginationInfo = useCallback((info: { shown: number }) => {
    setShownCount(info.shown);
  }, []);

  useEffect(() => {
    setActiveId(hackathonId);
    if (hackathonId) setSelectedHackathonId(hackathonId);
  }, [hackathonId, setSelectedHackathonId]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!activeId) return;
    setIsLoading(true);
    setError(null);
    try {
      setRows(
        await listOrganizations({
          hackathon: activeId,
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
      if (redirectIfUnauthorized(err, router)) return;
      setError(
        err instanceof Error ? err.message : "Failed to load organizations",
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeId, debouncedSearch, activeFilter, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => rows, [rows]);

  const createButton = (
    <Button
      size="sm"
      onClick={() => {
        setModalMode("create");
        setEditingId(null);
        setModalOpen(true);
      }}
    >
      Create organization
    </Button>
  );

  return (
    <div className="w-full space-y-3">
      {!embedded ? (
        <PageHeader
          eyebrow="Event workspace"
          title="Organizations"
          description="Organizations for this hackathon."
          actions={createButton}
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[var(--text-muted)]">
            Organizations belonging to this hackathon.
          </p>
          {createButton}
        </div>
      )}

      <StickyToolbar
        footer={
          <ListPageStats>
            <ListPageStat label="Total" value={filtered.length} />
            <ListPageStat label="Shown" value={shownCount} />
          </ListPageStats>
        }
      >
        <FilterTextField
          label="Search"
          className="min-w-[11rem] sm:max-w-xs"
          value={search}
          onChange={setSearch}
          placeholder="Organization name…"
        />
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

      <OrganizationFormModal
        open={modalOpen}
        mode={modalMode}
        hackathonId={activeId}
        organizationId={editingId}
        onClose={() => setModalOpen(false)}
        onSaved={() => void load()}
      />
    </div>
  );
}
