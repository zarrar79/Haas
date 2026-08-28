"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  BulkActionBar,
  runBulkSequential,
} from "@/components/ui/bulk-action-bar";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { FilterSelect, StickyToolbar } from "@/components/ui/sticky-toolbar";
import {
  TABLE_ELEMENT_CLASS,
  TableScroll,
} from "@/components/ui/table-scroll";
import { listChallengeAdmin } from "@/features/challenges/challenge-admin-api";
import { ChallengeCreateModal } from "@/features/challenges/challenge-create-modal";
import { ChallengeDetailModal } from "@/features/challenges/challenge-detail-modal";
import {
  attachChallengeToHackathon,
  approveChallengeLink,
  deleteChallenge,
  listAllChallenges,
  listEventChallengeLinks,
  removeChallengeFromHackathon,
  setChallengeActive,
  type ChallengeLink,
  type ChallengeSummary,
} from "@/features/challenges/challenge-api";
import {
  listCatalog,
  type CatalogItem,
} from "@/features/catalog/catalog-api";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { listHackathons } from "@/features/hackathons/hackathon-api";
import { ApiRequestError } from "@/lib/client-api";
import type { Hackathon } from "@/types/hackathon";

const ALL_HACKATHONS = "__all__";

type MembershipFilter = "all" | "added" | "not_added";
type VmFilter = "all" | "vm" | "non_vm";
type DynamicFilter = "all" | "static" | "dynamic";

type Row = {
  challengeId: string;
  name: string;
  categoryId?: string | null;
  category?: string | null;
  difficultyId?: string | null;
  difficulty?: string | null;
  typeId?: string | null;
  typeName?: string | null;
  isDynamic?: boolean | null;
  hasVm?: boolean | null;
  isActive?: boolean | null;
  createdInId?: string | null;
  createdInName?: string | null;
  createdById?: string | null;
  createdByLabel?: string | null;
  createdAt?: string | null;
  isAdded: boolean;
  link?: ChallengeLink;
};

type EventChallengesViewProps = {
  hackathonId?: string;
  syncUrl?: boolean;
};

function asId(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    return String((value as { id: unknown }).id);
  }
  return String(value);
}

function formatCreatedAt(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function createdByLabel(detail?: ChallengeSummary["created_by_detail"], id?: string | null) {
  if (!detail && !id) return null;
  const name = [detail?.name, detail?.last_name].filter(Boolean).join(" ").trim();
  return name || detail?.username || detail?.email || id || null;
}

function toRow(challenge: ChallengeSummary, link?: ChallengeLink): Row {
  const createdIn =
    challenge.created_in_hackathon?.display_name ||
    challenge.created_in_hackathon?.name ||
    null;

  return {
    challengeId: challenge.id,
    name: challenge.name,
    categoryId: asId(challenge.category),
    category: challenge.category_name,
    difficultyId: asId(challenge.difficulty_level),
    difficulty: challenge.difficulty_name,
    typeId: asId(challenge.challenge_type),
    typeName: challenge.type_name,
    isDynamic:
      typeof challenge.is_dynamic === "boolean" ? challenge.is_dynamic : null,
    hasVm: typeof challenge.has_vm === "boolean" ? challenge.has_vm : null,
    isActive:
      typeof challenge.is_active === "boolean" ? challenge.is_active : null,
    createdInId: challenge.created_in || challenge.created_in_hackathon?.id || null,
    createdInName: createdIn,
    createdById: challenge.created_by || challenge.created_by_detail?.id || null,
    createdByLabel: createdByLabel(
      challenge.created_by_detail,
      challenge.created_by,
    ),
    createdAt: challenge.created_at || null,
    isAdded: Boolean(link),
    link,
  };
}

export function EventChallengesView({
  hackathonId: hackathonIdProp,
  syncUrl = true,
}: EventChallengesViewProps) {
  const router = useRouter();
  const { setSelectedHackathonId } = useSelectedEvent();

  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [activeId, setActiveId] = useState<string>(
    hackathonIdProp || ALL_HACKATHONS,
  );
  const isAllScope = activeId === ALL_HACKATHONS || !activeId;

  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [membership, setMembership] = useState<MembershipFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [vmFilter, setVmFilter] = useState<VmFilter>("all");
  const [dynamicFilter, setDynamicFilter] = useState<DynamicFilter>("all");
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [difficulties, setDifficulties] = useState<CatalogItem[]>([]);
  const [types, setTypes] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [catalogLimited, setCatalogLimited] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(
    null,
  );
  const [detailChallengeId, setDetailChallengeId] = useState<string | null>(
    null,
  );
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (hackathonIdProp) {
      setActiveId(hackathonIdProp);
      setSelectedHackathonId(hackathonIdProp);
    }
  }, [hackathonIdProp, setSelectedHackathonId]);

  useEffect(() => {
    void (async () => {
      try {
        const { items } = await listHackathons({ show_deleted: "false" });
        setHackathons(items);
      } catch (err) {
        if (err instanceof ApiRequestError && err.httpStatus === 401) {
          router.replace("/login");
        }
      }
    })();
  }, [router]);

  useEffect(() => {
    void (async () => {
      try {
        const [cats, diffs, challengeTypes] = await Promise.all([
          listCatalog("categories"),
          listCatalog("difficulties"),
          listCatalog("challenge-types"),
        ]);
        setCategories(cats);
        setDifficulties(diffs);
        setTypes(challengeTypes);
      } catch {
        // Catalog optional for some roles.
      }
    })();
  }, []);

  const apiFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      limit: "100",
      category: categoryFilter || undefined,
      difficulty: difficultyFilter || undefined,
      type: typeFilter || undefined,
      is_dynamic:
        dynamicFilter === "dynamic"
          ? "true"
          : dynamicFilter === "static"
            ? "false"
            : undefined,
      has_vm:
        vmFilter === "vm" ? "true" : vmFilter === "non_vm" ? "false" : undefined,
    }),
    [
      debouncedSearch,
      categoryFilter,
      difficultyFilter,
      typeFilter,
      dynamicFilter,
      vmFilter,
    ],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setInfo(null);

    try {
      let allChallenges: ChallengeSummary[] = [];
      let limited = false;
      const links: ChallengeLink[] = [];

      if (isAllScope) {
        try {
          allChallenges = await listAllChallenges(apiFilters);
        } catch (err) {
          if (err instanceof ApiRequestError && err.httpStatus === 401) {
            router.replace("/login");
            return;
          }
          if (err instanceof ApiRequestError && err.httpStatus === 403) {
            setError(
              "Listing all challenges requires Root / system.admin. Select a hackathon instead.",
            );
            setRows([]);
            setCatalogLimited(true);
            return;
          }
          throw err;
        }
        setInfo(
          "Showing all platform challenges (in any hackathon or none).",
        );
      } else {
        try {
          allChallenges = await listAllChallenges(apiFilters);
        } catch (err) {
          if (err instanceof ApiRequestError && err.httpStatus === 403) {
            limited = true;
            try {
              allChallenges = await listChallengeAdmin(activeId, apiFilters);
              limited = false;
            } catch {
              // Fall back to linked only.
            }
          } else if (err instanceof ApiRequestError && err.httpStatus === 401) {
            router.replace("/login");
            return;
          } else {
            throw err;
          }
        }

        const eventLinks = await listEventChallengeLinks(activeId, {
          search: debouncedSearch || undefined,
          show_deleted: "false",
        });
        links.push(...eventLinks);

        if (limited) {
          setInfo(
            "Showing challenges already linked to this event. Full catalog requires Root / system.admin.",
          );
        }
      }

      setCatalogLimited(limited);

      const linkByChallengeId = new Map<string, ChallengeLink>();
      for (const link of links) {
        const cid =
          typeof link.challenge === "string"
            ? link.challenge
            : String(link.challenge);
        linkByChallengeId.set(cid, link);
      }

      const merged = new Map<string, Row>();

      for (const challenge of allChallenges) {
        const link = linkByChallengeId.get(challenge.id);
        merged.set(challenge.id, toRow(challenge, link));
      }

      for (const link of links) {
        const cid =
          typeof link.challenge === "string"
            ? link.challenge
            : String(link.challenge);
        if (!merged.has(cid)) {
          merged.set(cid, {
            challengeId: cid,
            name: link.challenge_name || cid,
            isAdded: true,
            link,
          });
        }
      }

      setRows(
        Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load challenges");
    } finally {
      setIsLoading(false);
    }
  }, [activeId, apiFilters, debouncedSearch, isAllScope, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (!isAllScope) {
        if (membership === "added" && !row.isAdded) return false;
        if (membership === "not_added" && row.isAdded) return false;
      }

      // Category/difficulty/type/vm/mode already applied server-side when possible;
      // keep client filters for sparse link-only rows.
      if (categoryFilter) {
        if (row.categoryId && row.categoryId !== categoryFilter) return false;
        if (!row.categoryId) return false;
      }
      if (difficultyFilter) {
        if (row.difficultyId && row.difficultyId !== difficultyFilter)
          return false;
        if (!row.difficultyId) return false;
      }
      if (typeFilter) {
        if (row.typeId && row.typeId !== typeFilter) return false;
        if (!row.typeId) return false;
      }
      if (vmFilter === "vm" && row.hasVm !== true) return false;
      if (vmFilter === "non_vm" && row.hasVm !== false) return false;
      if (dynamicFilter === "dynamic" && row.isDynamic !== true) return false;
      if (dynamicFilter === "static" && row.isDynamic !== false) return false;

      return true;
    });
  }, [
    rows,
    membership,
    categoryFilter,
    difficultyFilter,
    typeFilter,
    vmFilter,
    dynamicFilter,
    isAllScope,
  ]);

  function clearFilters() {
    setSearch("");
    setMembership("all");
    setCategoryFilter("");
    setDifficultyFilter("");
    setTypeFilter("");
    setVmFilter("all");
    setDynamicFilter("all");
  }

  function onHackathonChange(nextId: string) {
    setActiveId(nextId || ALL_HACKATHONS);
    if (nextId && nextId !== ALL_HACKATHONS) {
      setSelectedHackathonId(nextId);
      if (syncUrl) router.push(`/events/${nextId}/challenges`);
    } else {
      if (syncUrl) router.push("/challenges");
    }
  }

  async function addChallenge(challengeId: string) {
    if (isAllScope) {
      setError("Select a hackathon first to add a challenge to an event.");
      return;
    }
    setBusyId(challengeId);
    setError(null);
    try {
      await attachChallengeToHackathon(activeId, challengeId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add challenge");
    } finally {
      setBusyId(null);
    }
  }

  async function approveLink(linkId: string) {
    if (isAllScope) return;
    setBusyId(linkId);
    setError(null);
    try {
      await approveChallengeLink(activeId, linkId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setBusyId(null);
    }
  }

  async function removeLink(linkId: string, challengeId: string) {
    if (isAllScope) return;
    if (
      !window.confirm(
        "Remove this challenge from the hackathon? It stays in the platform catalog.",
      )
    ) {
      return;
    }
    setBusyId(linkId || challengeId);
    setError(null);
    try {
      await removeChallengeFromHackathon(activeId, linkId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove challenge");
    } finally {
      setBusyId(null);
    }
  }

  function scopeHackathonId() {
    return isAllScope ? null : activeId;
  }

  async function toggleActive(row: Row) {
    const next = !(row.isActive === true);
    setBusyId(row.challengeId);
    setError(null);
    try {
      await setChallengeActive(row.challengeId, next, scopeHackathonId());
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : next
            ? "Failed to activate challenge"
            : "Failed to deactivate challenge",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function removeChallenge(row: Row) {
    if (
      !window.confirm(
        `Delete challenge "${row.name}"? This soft-deletes it (sets inactive).`,
      )
    ) {
      return;
    }
    setBusyId(row.challengeId);
    setError(null);
    try {
      await deleteChallenge(row.challengeId, scopeHackathonId());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete challenge");
    } finally {
      setBusyId(null);
    }
  }

  const selectedRows = useMemo(
    () => filtered.filter((row) => selectedKeys.has(row.challengeId)),
    [filtered, selectedKeys],
  );

  useEffect(() => {
    const visible = new Set(filtered.map((r) => r.challengeId));
    setSelectedKeys((prev) => {
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [filtered]);

  async function runBulk(
    label: string,
    ids: string[],
    worker: (id: string) => Promise<void>,
  ) {
    if (ids.length === 0) return;
    setBulkBusy(true);
    setError(null);
    try {
      const result = await runBulkSequential(ids, worker);
      setSelectedKeys(new Set());
      await load();
      if (result.failed > 0) {
        setError(
          `${label}: ${result.ok} ok, ${result.failed} failed${
            result.error ? ` (${result.error})` : ""
          }`,
        );
      }
    } finally {
      setBulkBusy(false);
    }
  }

  function bulkActivate(active: boolean) {
    const ids = selectedRows.map((r) => r.challengeId);
    void runBulk(active ? "Activate" : "Deactivate", ids, (id) =>
      setChallengeActive(id, active, scopeHackathonId()).then(() => undefined),
    );
  }

  function bulkDelete() {
    const ids = selectedRows.map((r) => r.challengeId);
    if (
      !window.confirm(
        `Delete ${ids.length} selected challenge(s)? This soft-deletes them.`,
      )
    ) {
      return;
    }
    void runBulk("Delete", ids, (id) =>
      deleteChallenge(id, scopeHackathonId()).then(() => undefined),
    );
  }

  function bulkAdd() {
    if (isAllScope) return;
    const ids = selectedRows
      .filter((r) => !r.isAdded)
      .map((r) => r.challengeId);
    if (ids.length === 0) {
      setError("No selected challenges are available to add.");
      return;
    }
    void runBulk("Add", ids, (id) =>
      attachChallengeToHackathon(activeId, id).then(() => undefined),
    );
  }

  function bulkRemoveFromEvent() {
    if (isAllScope) return;
    const targets = selectedRows.filter((r) => r.isAdded && r.link);
    if (targets.length === 0) {
      setError("No selected challenges are attached to remove.");
      return;
    }
    if (
      !window.confirm(
        `Remove ${targets.length} challenge(s) from this hackathon?`,
      )
    ) {
      return;
    }
    void runBulk(
      "Remove",
      targets.map((r) => r.challengeId),
      async (id) => {
        const row = targets.find((r) => r.challengeId === id);
        if (!row?.link) return;
        await removeChallengeFromHackathon(activeId, row.link.id);
      },
    );
  }

  function toggleSelectAllVisible() {
    const ids = filtered.map((r) => r.challengeId);
    const allSelected =
      ids.length > 0 && ids.every((id) => selectedKeys.has(id));
    if (allSelected) {
      setSelectedKeys(new Set());
      return;
    }
    setSelectedKeys(new Set(ids));
  }

  function toggleSelectOne(id: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreate() {
    setEditingChallengeId(null);
    setShowCreate(true);
  }

  function openEdit(challengeId: string) {
    setEditingChallengeId(challengeId);
    setShowCreate(true);
  }

  function openDetail(challengeId: string) {
    setDetailChallengeId(challengeId);
  }

  function closeDetail() {
    setDetailChallengeId(null);
  }

  function closeModal() {
    setShowCreate(false);
    setEditingChallengeId(null);
  }

  function onRowDoubleClick(row: Row) {
    if (isAllScope || row.isAdded || busyId) return;
    void addChallenge(row.challengeId);
  }

  const addedCount = rows.filter((r) => r.isAdded).length;
  const notAddedCount = rows.length - addedCount;

  const hasActiveFilters =
    Boolean(search.trim()) ||
    membership !== "all" ||
    Boolean(categoryFilter) ||
    Boolean(difficultyFilter) ||
    Boolean(typeFilter) ||
    vmFilter !== "all" ||
    dynamicFilter !== "all";

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Event workspace"
        title="Challenges"
        description="Browse all challenges or scope to one hackathon. Create, edit, activate, or remove."
        actions={
          <>
            <Button variant="secondary" onClick={() => void load()}>
              Refresh
            </Button>
            <Button onClick={openCreate}>Create challenge</Button>
          </>
        }
      />

      <StickyToolbar>
        <FilterSelect
          label="Hackathon"
          value={activeId || ALL_HACKATHONS}
          onChange={onHackathonChange}
          className="min-w-[180px]"
        >
          <option value={ALL_HACKATHONS}>All challenges</option>
          {hackathons.map((h) => (
            <option key={h.id} value={h.id}>
              {h.display_name || h.name}
            </option>
          ))}
        </FilterSelect>

        <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-xs text-[var(--text-muted)]">
          <span className="font-medium text-[var(--text)]">Search</span>
          <input
            name="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, category, type…"
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[var(--focus-ring)]"
          />
        </label>

        {!isAllScope ? (
          <FilterSelect
            label="Membership"
            value={membership}
            onChange={(v) => setMembership(v as MembershipFilter)}
          >
            <option value="all">All</option>
            <option value="added">Added</option>
            <option value="not_added">Not added</option>
          </FilterSelect>
        ) : null}

        <FilterSelect
          label="Category"
          value={categoryFilter}
          onChange={setCategoryFilter}
        >
          <option value="">All</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name || item.id}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Difficulty"
          value={difficultyFilter}
          onChange={setDifficultyFilter}
        >
          <option value="">All</option>
          {difficulties.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name || item.id}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Type"
          value={typeFilter}
          onChange={setTypeFilter}
        >
          <option value="">All</option>
          {types.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name || item.id}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="VM"
          value={vmFilter}
          onChange={(v) => setVmFilter(v as VmFilter)}
        >
          <option value="all">All</option>
          <option value="vm">VM</option>
          <option value="non_vm">Non-VM</option>
        </FilterSelect>

        <FilterSelect
          label="Mode"
          value={dynamicFilter}
          onChange={(v) => setDynamicFilter(v as DynamicFilter)}
        >
          <option value="all">All</option>
          <option value="static">Static</option>
          <option value="dynamic">Dynamic</option>
        </FilterSelect>

        <div className="flex shrink-0 items-end gap-2 pb-0.5">
          <Button
            variant="secondary"
            size="sm"
            disabled={!hasActiveFilters}
            onClick={clearFilters}
          >
            Clear
          </Button>
        </div>
      </StickyToolbar>

      <div className="mb-3 flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
        <span>
          Total <strong className="text-[var(--text)]">{rows.length}</strong>
          {" · "}
          Shown <strong className="text-[var(--text)]">{filtered.length}</strong>
        </span>
        {!isAllScope ? (
          <span>
            Added <strong className="text-[var(--accent)]">{addedCount}</strong>
            {" · "}
            Not added{" "}
            <strong className="text-[var(--warning)]">{notAddedCount}</strong>
          </span>
        ) : null}
      </div>

      <ChallengeCreateModal
        open={showCreate}
        onClose={closeModal}
        onSaved={() => void load()}
        hackathonId={scopeHackathonId()}
        challengeId={editingChallengeId}
      />

      <ChallengeDetailModal
        open={detailChallengeId != null}
        onClose={closeDetail}
        challengeId={detailChallengeId}
        hackathonId={scopeHackathonId()}
        onEdit={openEdit}
      />

      {info ? (
        <div className="mb-3">
          <Alert variant="info">{info}</Alert>
        </div>
      ) : null}
      {error ? (
        <div className="mb-3">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      {!isAllScope ? (
        <p className="mb-2 text-xs text-[var(--text-muted)]">
          Tip: click a row to view challenge details. Double-click a{" "}
          <span className="text-[var(--warning)]">Not added</span> row to attach
          it as a draft link.
        </p>
      ) : (
        <p className="mb-2 text-xs text-[var(--text-muted)]">
          Tip: click a row to view challenge details.
        </p>
      )}

      <BulkActionBar
        selectedCount={selectedKeys.size}
        busy={bulkBusy}
        onClear={() => setSelectedKeys(new Set())}
        actions={[
          {
            id: "activate",
            label: "Activate",
            onClick: () => bulkActivate(true),
          },
          {
            id: "deactivate",
            label: "Deactivate",
            onClick: () => bulkActivate(false),
          },
          {
            id: "delete",
            label: "Delete",
            variant: "danger",
            onClick: bulkDelete,
          },
          ...(!isAllScope
            ? [
                {
                  id: "add",
                  label: "Add to event",
                  onClick: bulkAdd,
                },
                {
                  id: "remove",
                  label: "Remove from event",
                  onClick: bulkRemoveFromEvent,
                },
              ]
            : []),
        ]}
      />

      {isLoading ? (
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-10 text-center text-sm text-[var(--text-muted)]">
          Loading challenges…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-10 text-center text-sm text-[var(--text-muted)]">
          {catalogLimited && !hasActiveFilters
            ? "No challenges to show."
            : "No challenges match your filters."}
        </div>
      ) : (
        <TableScroll>
          <table className={TABLE_ELEMENT_CLASS}>
                <thead className="border-b border-[var(--border)] bg-[var(--surface-raised)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all challenges"
                    checked={
                      filtered.length > 0 &&
                      filtered.every((r) => selectedKeys.has(r.challengeId))
                    }
                    ref={(el) => {
                      if (!el) return;
                      const some = filtered.some((r) =>
                        selectedKeys.has(r.challengeId),
                      );
                      const all =
                        filtered.length > 0 &&
                        filtered.every((r) => selectedKeys.has(r.challengeId));
                      el.indeterminate = some && !all;
                    }}
                    onChange={toggleSelectAllVisible}
                  />
                </th>
                <th className="px-4 py-3">Challenge</th>
                <th className="px-4 py-3">Meta</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Created in</th>
                <th className="px-4 py-3">Created by</th>
                <th className="px-4 py-3">Created at</th>
                {!isAllScope ? (
                  <th className="px-4 py-3">In this hackathon</th>
                ) : null}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.challengeId}
                  onClick={() => openDetail(row.challengeId)}
                  onDoubleClick={() => onRowDoubleClick(row)}
                  className={`cursor-pointer border-b border-[var(--border)] last:border-b-0 ${
                    selectedKeys.has(row.challengeId)
                      ? "bg-[var(--accent-muted)]/30"
                      : ""
                  } hover:bg-[var(--surface-raised)]/50 ${
                    !isAllScope && !row.isAdded
                      ? "hover:bg-[var(--accent-muted)]/40"
                      : ""
                  }`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${row.name}`}
                      checked={selectedKeys.has(row.challengeId)}
                      onChange={() => toggleSelectOne(row.challengeId)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text)]">
                      {row.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {[row.category, row.difficulty, row.typeName]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.isDynamic == null ? null : row.isDynamic ? (
                        <Badge tone="warning">Dynamic</Badge>
                      ) : (
                        <Badge>Static</Badge>
                      )}
                      {row.hasVm == null ? null : row.hasVm ? (
                        <Badge tone="success">VM</Badge>
                      ) : (
                        <Badge>Non-VM</Badge>
                      )}
                      {row.isDynamic == null && row.hasVm == null ? "—" : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {row.isActive == null ? (
                      <span className="text-[var(--text-muted)]">—</span>
                    ) : row.isActive ? (
                      <Badge tone="success">Active</Badge>
                    ) : (
                      <Badge tone="warning">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text)]">
                    {row.createdInName || (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text)]">
                    {row.createdByLabel || (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">
                    {formatCreatedAt(row.createdAt)}
                  </td>
                  {!isAllScope ? (
                    <td className="px-4 py-3">
                      {row.isAdded ? (
                        <div className="flex flex-wrap gap-1">
                          <Badge tone="success">Added</Badge>
                          {row.link?.status ? (
                            <Badge
                              tone={
                                row.link.status === "approved"
                                  ? "success"
                                  : row.link.status === "draft"
                                    ? "warning"
                                    : "neutral"
                              }
                            >
                              {row.link.status}
                            </Badge>
                          ) : null}
                        </div>
                      ) : (
                        <Badge tone="warning">Not added</Badge>
                      )}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 text-right">
                    <div
                      className="flex flex-wrap justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openDetail(row.challengeId)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === row.challengeId}
                        onClick={() => openEdit(row.challengeId)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === row.challengeId}
                        onClick={() => void toggleActive(row)}
                      >
                        {row.isActive === true ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === row.challengeId}
                        onClick={() => void removeChallenge(row)}
                      >
                        Delete
                      </Button>
                      {!isAllScope ? (
                        row.isAdded && row.link ? (
                          <>
                            {row.link.status === "draft" ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={busyId === row.link.id}
                                onClick={() => void approveLink(row.link!.id)}
                              >
                                Approve
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busyId === row.link.id}
                              onClick={() =>
                                void removeLink(row.link!.id, row.challengeId)
                              }
                            >
                              {busyId === row.link.id ? "Removing…" : "Remove"}
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            disabled={busyId === row.challengeId}
                            onClick={() => void addChallenge(row.challengeId)}
                          >
                            {busyId === row.challengeId ? "Adding…" : "Add"}
                          </Button>
                        )
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      )}
    </div>
  );
}
