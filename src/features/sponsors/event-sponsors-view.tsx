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
import { StickyToolbar } from "@/components/ui/sticky-toolbar";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { HackathonPicker } from "@/features/events/hackathon-picker";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import {
  getHackathon,
  updateHackathon,
} from "@/features/hackathons/hackathon-api";
import {
  listSponsors,
  type Sponsor,
} from "@/features/sponsors/sponsor-api";
import { SponsorFormModal } from "@/features/sponsors/sponsor-form-modal";
import { ApiRequestError } from "@/lib/client-api";

type Props = {
  hackathonId: string;
  /** When true, omit page chrome (used inside Hackathon tab). */
  embedded?: boolean;
};

type ActiveFilter = "all" | "active" | "inactive";

export function EventSponsorsView({ hackathonId, embedded = false }: Props) {
  const router = useRouter();
  const { setSelectedHackathonId } = useSelectedEvent();
  const [activeId, setActiveId] = useState(hackathonId);
  const [attachedIds, setAttachedIds] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<Sponsor[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [shownCount, setShownCount] = useState(0);
  const onPaginationInfo = useCallback((info: { shown: number }) => {
    setShownCount(info.shown);
  }, []);

  useEffect(() => {
    setActiveId(hackathonId);
  }, [hackathonId]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!activeId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [hackathon, sponsors] = await Promise.all([
        getHackathon(activeId),
        listSponsors({
          search: debouncedSearch || undefined,
          active:
            activeFilter === "active"
              ? "true"
              : activeFilter === "inactive"
                ? "false"
                : undefined,
        }),
      ]);
      const linked = (hackathon.sponsors || []).map((s) => s.id);
      setAttachedIds(linked);
      // Prefer event-attached rows; fall back to catalog filtered to attached.
      const byId = new Map(sponsors.map((s) => [s.id, s]));
      for (const s of hackathon.sponsors || []) {
        if (!byId.has(s.id)) byId.set(s.id, s as Sponsor);
      }
      const attachedRows = linked
        .map((id) => byId.get(id))
        .filter(Boolean) as Sponsor[];
      setCatalog(attachedRows.length > 0 ? attachedRows : []);
      // If search/filter on, also show matching catalog only among attached
      if (debouncedSearch || activeFilter !== "all") {
        const q = debouncedSearch.toLowerCase();
        setCatalog(
          attachedRows.filter((row) => {
            if (q && !row.name.toLowerCase().includes(q)) return false;
            if (activeFilter === "active" && row.active === false) return false;
            if (activeFilter === "inactive" && row.active !== false) return false;
            return true;
          }),
        );
      }
    } catch (err) {
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load sponsors");
    } finally {
      setIsLoading(false);
    }
  }, [activeId, debouncedSearch, activeFilter, router]);

  useEffect(() => {
    void load();
  }, [load]);

  function onHackathonChange(nextId: string) {
    setActiveId(nextId);
    setSelectedHackathonId(nextId || null);
    if (nextId) router.push(`/events/${nextId}/hackathon?tab=sponsors`);
  }

  async function attachSponsor(sponsorId: string) {
    setBusyId(sponsorId);
    setError(null);
    try {
      const next = Array.from(new Set([...attachedIds, sponsorId]));
      await updateHackathon(activeId, { sponsor_ids: next });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to attach sponsor");
    } finally {
      setBusyId(null);
    }
  }

  async function detachSponsor(sponsorId: string) {
    setBusyId(sponsorId);
    setError(null);
    try {
      const next = attachedIds.filter((id) => id !== sponsorId);
      await updateHackathon(activeId, { sponsor_ids: next });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove sponsor");
    } finally {
      setBusyId(null);
    }
  }

  async function onCreated(sponsor: Sponsor) {
    await attachSponsor(sponsor.id);
  }

  const filtered = useMemo(() => catalog, [catalog]);

  const createButton = (
    <Button
      size="sm"
      onClick={() => {
        setModalMode("create");
        setEditingId(null);
        setModalOpen(true);
      }}
    >
      Create sponsor
    </Button>
  );

  return (
    <div className="w-full space-y-3">
      {!embedded ? (
        <PageHeader
          eyebrow="Event workspace"
          title="Sponsors"
          description="Sponsors attached to this hackathon."
          actions={createButton}
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[var(--text-muted)]">
            Sponsors attached to this hackathon.
          </p>
          {createButton}
        </div>
      )}

      <StickyToolbar
        footer={
          <ListPageStats>
            <ListPageStat label="Attached" value={filtered.length} />
            <ListPageStat label="Shown" value={shownCount} />
          </ListPageStats>
        }
      >
        {!embedded ? (
          <HackathonPicker
            value={activeId}
            onChange={onHackathonChange}
            section="hackathon"
            className="min-w-[180px]"
          />
        ) : null}
        <label className="flex min-w-[11rem] flex-1 flex-col gap-1 text-xs text-[var(--text-muted)] sm:max-w-xs">
          <span className="font-medium text-[var(--text)]">Search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sponsor name…"
            className="rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--input-bg)] px-2 py-2 text-sm text-[var(--text)] outline-none"
          />
        </label>
        <label className="flex min-w-[8rem] flex-col gap-1 text-xs text-[var(--text-muted)]">
          <span className="font-medium text-[var(--text)]">Status</span>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-sm text-[var(--text)]"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
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
        emptyMessage="No sponsors attached to this hackathon yet."
        columns={[
          {
            key: "name",
            header: "Sponsor",
            render: (row) => (
              <div className="flex items-center gap-3">
                <Avatar
                  src={row.image_url}
                  name={row.name}
                  size="sm"
                  rounded="md"
                />
                <div>
                  <div className="font-medium">{row.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {[row.tag, row.organization_type].filter(Boolean).join(" · ") ||
                      "—"}
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (row) =>
              row.active === false ? (
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
                    disabled: busyId === row.id,
                    onClick: () => {
                      setModalMode("edit");
                      setEditingId(row.id);
                      setModalOpen(true);
                    },
                  },
                  {
                    id: "detach",
                    label: "Remove from event",
                    disabled: busyId === row.id,
                    destructive: true,
                    onClick: () => void detachSponsor(row.id),
                  },
                ]}
              />
            ),
          },
        ]}
      />

      <SponsorFormModal
        open={modalOpen}
        mode={modalMode}
        sponsorId={editingId}
        onClose={() => setModalOpen(false)}
        onSaved={(sponsor) => {
          if (modalMode === "create") {
            void onCreated(sponsor);
          } else {
            void load();
          }
        }}
      />
    </div>
  );
}
