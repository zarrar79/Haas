"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  BulkActionBar,
  runBulkSequential,
} from "@/components/ui/bulk-action-bar";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
  ListPageStat,
  ListPageStats,
  ListPageStatsDot,
} from "@/components/ui/list-page-stats";
import { TableSkeleton } from "@/components/ui/skeleton";
import { FilterSelect, FilterTextField, StickyToolbar } from "@/components/ui/sticky-toolbar";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  TablePagination,
} from "@/components/ui/table-pagination";
import {
  TABLE_ELEMENT_CLASS,
  TABLE_STICKY_ACTIONS_CLASS,
  TableScroll,
} from "@/components/ui/table-scroll";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { AttachChallengeModal } from "@/features/challenges/attach-challenge-modal";
import { ChallengeCreateModal } from "@/features/challenges/challenge-create-modal";
import { ChallengeDetailModal } from "@/features/challenges/challenge-detail-modal";
import {
  addPlayingChallenges,
  deleteChallenge,
  listAllChallenges,
  listPlayingChallenges,
  removePlayingChallenge,
  setChallengeActive,
  type ChallengeLinkedHackathon,
  type ChallengeSummary,
} from "@/features/challenges/challenge-api";
import { PlayingInChips } from "@/components/ui/playing-in-chips";
import {
  listCatalog,
  type CatalogItem,
} from "@/features/catalog/catalog-api";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import {
  applySectionSearch,
  challengeRowSearchParts,
  useSectionSearch,
} from "@/features/search/section-search";
import { listHackathons } from "@/features/hackathons/hackathon-api";
import {
  ALL_EVENTS_SCOPE,
  isAllEventsScope,
} from "@/features/events/event-scope";
import {
  getAssignedHackathons,
} from "@/lib/assigned-events";
import { redirectIfUnauthorized } from "@/lib/client-api";
import { hackathonLabel } from "@/lib/display-name";
import type { Hackathon } from "@/types/hackathon";

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
  /** On the live playing roster for the scoped event. */
  isAdded: boolean;
  /** Catalog hackathon ids where this challenge is on the playing roster. */
  playingHackathonIds: string[];
  /** Live playing-roster events (for chips / remove). */
  playingIn: ChallengeLinkedHackathon[];
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

function toRow(
  challenge: ChallengeSummary,
  opts?: {
    isAdded?: boolean;
    playingHackathonIds?: string[];
    playingIn?: ChallengeLinkedHackathon[];
  },
): Row {
  const createdIn =
    challenge.created_in_hackathon?.display_name ||
    challenge.created_in_hackathon?.name ||
    null;

  const playingIn =
    opts?.playingIn ??
    (challenge.playing_in || []).filter((h) => Boolean(h?.id));
  const playingIds =
    opts?.playingHackathonIds ?? playingIn.map((h) => h.id).filter(Boolean);

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
    isAdded: opts?.isAdded ?? false,
    playingHackathonIds: playingIds,
    playingIn,
  };
}

export function EventChallengesView({
  hackathonId: hackathonIdProp,
  syncUrl = true,
}: EventChallengesViewProps) {
  const router = useRouter();
  const { confirm, alert } = usePlatformDialog();
  const { setSelectedHackathonId } = useSelectedEvent();
  const { me, isPlatformOperator, isEventOnlyAdmin } = useHaasAccess();
  const assignedHackathons = getAssignedHackathons(me);

  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [activeId, setActiveId] = useState<string>(
    hackathonIdProp || ALL_EVENTS_SCOPE,
  );
  const isAllScope = isAllEventsScope(activeId);

  const [rows, setRows] = useState<Row[]>([]);
  const { search, setSearch, debouncedSearch, focusId, clearDeepSearch } =
    useSectionSearch();
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
  const tableRef = useRef<HTMLTableElement>(null);
  const [catalogLimited, setCatalogLimited] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(
    null,
  );
  const [detailChallengeId, setDetailChallengeId] = useState<string | null>(
    null,
  );
  const [attachTarget, setAttachTarget] = useState<{
    challengeIds: string[];
    label?: string;
    playingByChallengeId: Record<string, string[]>;
  } | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

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
        redirectIfUnauthorized(err, router);
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
      let playing: ChallengeSummary[] = [];

      if (isAllScope) {
        allChallenges = await listAllChallenges(apiFilters);
        setInfo(
          "Showing all challenges in the platform catalog. Select a hackathon to add challenges to its playing roster.",
        );
      } else {
        [allChallenges, playing] = await Promise.all([
          listAllChallenges({
            ...apiFilters,
            hackathon: activeId,
          }),
          listPlayingChallenges(activeId, {
            search: debouncedSearch || undefined,
            limit: "200",
          }),
        ]);
      }

      setCatalogLimited(false);

      const playingIds = new Set(playing.map((c) => c.id));
      const activeHackathon = !isAllScope
        ? hackathons.find((h) => h.id === activeId)
        : null;
      const merged = new Map<string, Row>();

      function withScopedPlaying(
        challenge: ChallengeSummary,
        onPlayingRoster: boolean,
      ) {
        const byId = new Map<string, ChallengeLinkedHackathon>();
        for (const h of challenge.playing_in || []) {
          if (h?.id) byId.set(h.id, h);
        }
        if (
          !isAllScope &&
          activeId &&
          onPlayingRoster &&
          !byId.has(activeId)
        ) {
          byId.set(activeId, {
            id: activeId,
            name: activeHackathon?.name,
            display_name: activeHackathon?.display_name,
          });
        }
        const playingIn = [...byId.values()];
        return toRow(challenge, {
          isAdded: !isAllScope && onPlayingRoster,
          playingHackathonIds: playingIn.map((h) => h.id),
          playingIn,
        });
      }

      for (const challenge of allChallenges) {
        merged.set(
          challenge.id,
          withScopedPlaying(challenge, playingIds.has(challenge.id)),
        );
      }

      // Ensure every playing-roster challenge appears even if catalog page missed it.
      for (const challenge of playing) {
        if (merged.has(challenge.id)) continue;
        merged.set(challenge.id, withScopedPlaying(challenge, true));
      }

      setRows(
        Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name)),
      );
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Failed to load challenges");
    } finally {
      setIsLoading(false);
    }
  }, [activeId, apiFilters, debouncedSearch, hackathons, isAllScope, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const base = rows.filter((row) => {
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

    return applySectionSearch(
      base,
      debouncedSearch,
      focusId,
      challengeRowSearchParts,
      (row) => row.challengeId,
    );
  }, [
    rows,
    membership,
    categoryFilter,
    difficultyFilter,
    typeFilter,
    vmFilter,
    dynamicFilter,
    isAllScope,
    debouncedSearch,
    focusId,
  ]);

  useEffect(() => {
    setPage(1);
  }, [filtered, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize) || 1);
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  function clearFilters() {
    clearDeepSearch();
    setMembership("all");
    setCategoryFilter("");
    setDifficultyFilter("");
    setTypeFilter("");
    setVmFilter("all");
    setDynamicFilter("all");
  }

  function onHackathonChange(nextId: string) {
    setActiveId(nextId || ALL_EVENTS_SCOPE);
    if (nextId && nextId !== ALL_EVENTS_SCOPE) {
      setSelectedHackathonId(nextId);
      if (syncUrl) router.push(`/events/${nextId}/challenges`);
    } else {
      if (syncUrl) router.push("/challenges");
    }
  }

  async function addChallenge(challengeId: string) {
    if (isAllScope) {
      setError("Select a hackathon first to add a challenge to playing.");
      return;
    }
    setBusyId(challengeId);
    setError(null);
    try {
      await addPlayingChallenges(activeId, [challengeId]);
      const scoped = hackathons.find((h) => h.id === activeId);
      setRows((prev) =>
        prev.map((r) => {
          if (r.challengeId !== challengeId) return r;
          if (r.playingHackathonIds.includes(activeId)) {
            return { ...r, isAdded: true };
          }
          const nextPlaying: ChallengeLinkedHackathon = {
            id: activeId,
            name: scoped?.name,
            display_name: scoped?.display_name,
          };
          return {
            ...r,
            isAdded: true,
            playingHackathonIds: [...r.playingHackathonIds, activeId],
            playingIn: [...r.playingIn, nextPlaying],
          };
        }),
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add challenge");
    } finally {
      setBusyId(null);
    }
  }

  async function removePlayingAssociation(
    challengeId: string,
    hackathonId: string,
    challengeName?: string,
  ) {
    const event =
      hackathons.find((h) => h.id === hackathonId) ||
      rows
        .find((r) => r.challengeId === challengeId)
        ?.playingIn.find((h) => h.id === hackathonId);
    const ok = await confirm({
      title: "Remove from playing",
      message: `Remove${challengeName ? ` “${challengeName}”` : " this challenge"} from the playing roster of ${hackathonLabel(event || { id: hackathonId })}?`,
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    setBusyId(challengeId);
    setError(null);
    try {
      await removePlayingChallenge(hackathonId, challengeId);
      setRows((prev) =>
        prev.map((r) =>
          r.challengeId === challengeId
            ? {
                ...r,
                isAdded:
                  !isAllScope && activeId === hackathonId ? false : r.isAdded,
                playingHackathonIds: r.playingHackathonIds.filter(
                  (id) => id !== hackathonId,
                ),
                playingIn: r.playingIn.filter((h) => h.id !== hackathonId),
              }
            : r,
        ),
      );
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove from playing",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function removeFromPlaying(challengeId: string, name?: string) {
    if (isAllScope) return;
    await removePlayingAssociation(challengeId, activeId, name);
  }

  function scopeHackathonId() {
    return isAllScope ? null : activeId;
  }

  const canCreateChallenge =
    isPlatformOperator ||
    Boolean(scopeHackathonId() && me && assignedHackathons.some(
      (row) => row.hackathon_id === scopeHackathonId(),
    ));

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
    const ok = await confirm({
      title: "Delete challenge",
      message: `Delete challenge "${row.name}"? This soft-deletes it (sets inactive).`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) {
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

  async function bulkDelete() {
    const ids = selectedRows.map((r) => r.challengeId);
    const ok = await confirm({
      title: "Delete challenges",
      message: `Delete ${ids.length} selected challenge(s)? This soft-deletes them.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) {
      return;
    }
    void runBulk("Delete", ids, (id) =>
      deleteChallenge(id, scopeHackathonId()).then(() => undefined),
    );
  }

  function buildPlayingMap(ids: string[]) {
    const map: Record<string, string[]> = {};
    for (const id of ids) {
      const row = rows.find((r) => r.challengeId === id);
      const playing = [...(row?.playingHackathonIds || [])];
      if (
        !isAllScope &&
        row?.isAdded &&
        activeId &&
        !playing.includes(activeId)
      ) {
        playing.push(activeId);
      }
      map[id] = playing;
    }
    return map;
  }

  function bulkAdd() {
    if (!isAllScope) {
      const ids = selectedRows.filter((r) => !r.isAdded).map((r) => r.challengeId);
      if (ids.length === 0) {
        setError("No selected challenges are available to add to playing.");
        return;
      }
      void runBulk("Add to playing", ids, (id) =>
        addPlayingChallenges(activeId, [id]).then(() => undefined),
      );
      return;
    }
    const ids = selectedRows.map((r) => r.challengeId);
    if (ids.length === 0) {
      setError("Select at least one challenge to add to playing.");
      return;
    }
    setAttachTarget({
      challengeIds: ids,
      label: ids.length === 1 ? selectedRows[0]?.name : undefined,
      playingByChallengeId: buildPlayingMap(ids),
    });
  }

  function openAttachOne(row: Row) {
    setAttachTarget({
      challengeIds: [row.challengeId],
      label: row.name,
      playingByChallengeId: buildPlayingMap([row.challengeId]),
    });
  }

  async function bulkRemoveFromEvent() {
    if (isAllScope) return;
    const ids = selectedRows.filter((r) => r.isAdded).map((r) => r.challengeId);
    if (ids.length === 0) {
      setError("No selected challenges are on the playing roster to remove.");
      return;
    }
    const ok = await confirm({
      title: "Remove from playing",
      message: `Remove ${ids.length} challenge(s) from this event's playing roster?`,
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) {
      return;
    }
    void runBulk("Remove from playing", ids, (id) =>
      removePlayingChallenge(activeId, id).then(() => undefined),
    );
  }

  function toggleSelectAllVisible() {
    const ids = pageRows.map((r) => r.challengeId);
    const allSelected =
      ids.length > 0 && ids.every((id) => selectedKeys.has(id));
    if (allSelected) {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
      return;
    }
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }

  function toggleSelectOne(id: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function openCreate() {
    if (!canCreateChallenge) {
      await alert({
        title: "Action not allowed",
        message:
          isEventOnlyAdmin
            ? "Select one of your assigned hackathons before creating a challenge."
            : "You do not have permission to create challenges here.",
        variant: "warning",
      });
      return;
    }
    if (!isPlatformOperator && isAllScope) {
      await alert({
        title: "Select an event",
        message:
          "Select an assigned hackathon — challenges can only be created inside your events.",
        variant: "warning",
      });
      return;
    }
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
    Boolean(focusId) ||
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
        actions={
          canCreateChallenge || isEventOnlyAdmin ? (
            <Button
              onClick={openCreate}
              disabled={!canCreateChallenge}
              title={
                !canCreateChallenge
                  ? "Select an assigned hackathon first"
                  : undefined
              }
            >
              Create challenge
            </Button>
          ) : undefined
        }
      />

      <StickyToolbar
        footer={
          <ListPageStats>
            <ListPageStat label="Total" value={rows.length} />
            <ListPageStatsDot />
            <ListPageStat label="Shown" value={pageRows.length} />
            {!isAllScope ? (
              <>
                <ListPageStatsDot />
                <ListPageStat
                  label="On playing"
                  value={addedCount}
                  tone="accent"
                />
                <ListPageStatsDot />
                <ListPageStat
                  label="Not on playing"
                  value={notAddedCount}
                  tone="warning"
                />
              </>
            ) : null}
            {(debouncedSearch || focusId) ? (
              <>
                <ListPageStatsDot />
                <span className="text-[var(--accent)]">
                  {focusId
                    ? "Deep search result"
                    : `Matching “${debouncedSearch}”`}
                </span>
              </>
            ) : null}
          </ListPageStats>
        }
      >
        {!hackathonIdProp ? (
          <FilterSelect
            label="Hackathon"
            value={activeId || ALL_EVENTS_SCOPE}
            onChange={onHackathonChange}
            className="min-w-[180px]"
          >
            <option value={ALL_EVENTS_SCOPE}>All challenges</option>
            {hackathons.map((h) => (
              <option key={h.id} value={h.id}>
                {hackathonLabel(h)}
              </option>
            ))}
          </FilterSelect>
        ) : null}

        <FilterTextField
          label="Search"
          name="search"
          value={search}
          onChange={setSearch}
          placeholder="Name, category, type…"
        />

        {!isAllScope ? (
          <FilterSelect
            label="Membership"
            value={membership}
            onChange={(v) => setMembership(v as MembershipFilter)}
          >
            <option value="all">All</option>
            <option value="added">On playing</option>
            <option value="not_added">Not on playing</option>
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

      <ChallengeCreateModal
        open={showCreate}
        onClose={closeModal}
        onSaved={() => void load()}
        hackathonId={scopeHackathonId()}
        challengeId={editingChallengeId}
      />

      <AttachChallengeModal
        open={attachTarget != null}
        onClose={() => setAttachTarget(null)}
        onAttached={() => {
          setSelectedKeys(new Set());
          void load();
        }}
        challengeIds={attachTarget?.challengeIds ?? []}
        challengeLabel={attachTarget?.label}
        hackathons={hackathons}
        playingByChallengeId={attachTarget?.playingByChallengeId ?? {}}
        defaultHackathonId={scopeHackathonId()}
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

      {/* {!isAllScope ? (
        <p className="mb-2 text-xs text-[var(--text-muted)]">
          Tip: click a row to view challenge details. Double-click a{" "}
          <span className="text-[var(--warning)]">Not added</span> row to attach
          it as a draft link.
        </p>
      ) : (
        <p className="mb-2 text-xs text-[var(--text-muted)]">
          Tip: click a row to view challenge details.
        </p>
      )} */}

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
          {
            id: "add",
            label: isAllScope ? "Add to playing…" : "Add to playing",
            onClick: bulkAdd,
          },
          ...(!isAllScope
            ? [
                {
                  id: "remove",
                  label: "Remove from playing",
                  onClick: bulkRemoveFromEvent,
                },
              ]
            : []),
        ]}
      />

      {isLoading ? (
        <TableSkeleton columns={11} rows={10} selectable />
      ) : filtered.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-10 text-center text-sm text-[var(--text-muted)]">
          {catalogLimited && !hasActiveFilters
            ? "No challenges to show."
            : "No challenges match your filters."}
        </div>
      ) : (
        <div>
          <TableScroll tableRef={tableRef}>
            <table ref={tableRef} className={TABLE_ELEMENT_CLASS}>
                <thead className="border-b border-[var(--border)] bg-[var(--surface-raised)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all challenges"
                    checked={
                      pageRows.length > 0 &&
                      pageRows.every((r) => selectedKeys.has(r.challengeId))
                    }
                    ref={(el) => {
                      if (!el) return;
                      const some = pageRows.some((r) =>
                        selectedKeys.has(r.challengeId),
                      );
                      const all =
                        pageRows.length > 0 &&
                        pageRows.every((r) => selectedKeys.has(r.challengeId));
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
                <th className="px-4 py-3">Playing in</th>
                {!isAllScope ? (
                  <th className="px-4 py-3">Membership</th>
                ) : null}
                <th className={`px-4 py-3 text-right w-12 ${TABLE_STICKY_ACTIONS_CLASS}`} />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr
                  key={row.challengeId}
                  onDoubleClick={() => onRowDoubleClick(row)}
                  data-selected={selectedKeys.has(row.challengeId) ? "true" : undefined}
                  className={`border-b border-[var(--border)] last:border-b-0 ${
                    selectedKeys.has(row.challengeId)
                      ? "bg-[var(--accent-muted)]/30"
                      : ""
                  } hover:bg-[var(--surface-raised)]/50`}
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
                  <td className="px-4 py-3 min-w-[10rem] max-w-[16rem]">
                    <PlayingInChips
                      events={row.playingIn}
                      busy={busyId === row.challengeId}
                      emptyLabel="Not on any playing roster"
                      onRemove={(hackathonId) =>
                        void removePlayingAssociation(
                          row.challengeId,
                          hackathonId,
                          row.name,
                        )
                      }
                    />
                  </td>
                  {!isAllScope ? (
                    <td className="px-4 py-3">
                      {row.isAdded ? (
                        <Badge tone="success">Added</Badge>
                      ) : (
                        <Badge tone="warning">Not added</Badge>
                      )}
                    </td>
                  ) : null}
                  <td className={`px-4 py-3 text-right ${TABLE_STICKY_ACTIONS_CLASS}`} onClick={(e) => e.stopPropagation()}>
                    <RowActionsMenu
                      label={`Actions for ${row.name}`}
                      items={[
                        {
                          id: "view",
                          label: "View",
                          onClick: () => openDetail(row.challengeId),
                        },
                        {
                          id: "edit",
                          label: "Edit",
                          disabled: busyId === row.challengeId,
                          onClick: () => openEdit(row.challengeId),
                        },
                        {
                          id: "toggle",
                          label: row.isActive === true ? "Deactivate" : "Activate",
                          disabled: busyId === row.challengeId,
                          onClick: () => void toggleActive(row),
                        },
                        {
                          id: "delete",
                          label: "Delete",
                          disabled: busyId === row.challengeId,
                          destructive: true,
                          onClick: () => void removeChallenge(row),
                        },
                        {
                          id: "add-hackathons",
                          label: "Add to playing…",
                          disabled: busyId === row.challengeId,
                          onClick: () => openAttachOne(row),
                        },
                        ...(!isAllScope
                          ? row.isAdded
                            ? [
                                {
                                  id: "remove-playing",
                                  label:
                                    busyId === row.challengeId
                                      ? "Removing…"
                                      : "Remove from playing",
                                  disabled: busyId === row.challengeId,
                                  onClick: () =>
                                    void removeFromPlaying(
                                      row.challengeId,
                                      row.name,
                                    ),
                                },
                              ]
                            : [
                                {
                                  id: "add",
                                  label:
                                    busyId === row.challengeId
                                      ? "Adding…"
                                      : "Add to playing",
                                  disabled: busyId === row.challengeId,
                                  onClick: () =>
                                    void addChallenge(row.challengeId),
                                },
                              ]
                          : []),
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
          <TablePagination
            page={safePage}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
}
