"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  BulkActionBar,
  runBulkSequential,
} from "@/components/ui/bulk-action-bar";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { FormCheckbox, FormSelect } from "@/components/ui/form-fields";
import { ModalShell } from "@/components/ui/modal-shell";
import { PageHeader } from "@/components/ui/page-header";
import {
  ListPageStat,
  ListPageStats,
  ListPageStatsDot,
} from "@/components/ui/list-page-stats";
import { PlayingInChips } from "@/components/ui/playing-in-chips";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { FilterSelect, FilterTextField, StickyToolbar } from "@/components/ui/sticky-toolbar";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import { useSectionSearch, applySectionSearch, teamRowSearchParts } from "@/features/search/section-search";
import {
  listReferers,
  type RefererItem,
} from "@/features/catalog/catalog-api";
import { listHackathons } from "@/features/hackathons/hackathon-api";
import {
  applyTeamNetworkPolicyEnsuringPool,
  attachTeam,
  blockPlatformTeam,
  unblockPlatformTeam,
  deleteTeamNetworkPolicy,
  detachTeamFromHackathon,
  listPlatformTeams,
  removePlayingTeam,
  provisionTeamIpPool,
  setTeamActive,
  updateTeam,
  type EventTeam,
} from "@/features/teams/team-api";
import { TeamFormModal, TeamMembersCell } from "@/features/teams/event-teams-view";
import { AddTeamMemberModal } from "@/features/teams/add-team-member-modal";
import { TeamNetworkPolicyCell } from "@/features/teams/team-network-policy-cell";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import { redirectIfUnauthorized } from "@/lib/client-api";
import { hackathonLabel } from "@/lib/display-name";
import type { Hackathon } from "@/types/hackathon";

type MembershipFilter = "all" | "added" | "not_added";
type SideFilter = "" | "red" | "blue" | "mix";
type ActiveFilter = "all" | "active" | "inactive";

function isInHackathon(team: EventTeam, hackathonId: string) {
  return (team.playing_in || []).some((h) => h.id === hackathonId);
}

/**
 * Hackathon used for member management (member endpoints are event-scoped):
 * the filtered event when the team is in it, else where it was created, else
 * the first event it plays in.
 */
function memberHackathonId(team: EventTeam, hackathonFilter: string): string | null {
  if (hackathonFilter && (isInHackathon(team, hackathonFilter) || team.created_in === hackathonFilter)) {
    return hackathonFilter;
  }
  return team.created_in || team.playing_in?.[0]?.id || null;
}

/** Catalog "created for" event ids only — never mix with live playing roster. */
function teamLinkedHackathonIds(team: EventTeam): string[] {
  const ids = new Set<string>();
  for (const h of team.created_for || []) {
    if (h?.id) ids.add(h.id);
  }
  if (team.created_in) ids.add(team.created_in);
  if (team.created_in_hackathon?.id) ids.add(team.created_in_hackathon.id);
  return [...ids];
}

/** Pick a hackathon and attach one or more teams to its live roster. */
function AddToHackathonModal({
  teams,
  hackathons,
  defaultHackathonId,
  onClose,
  onDone,
}: {
  teams: EventTeam[];
  hackathons: Hackathon[];
  defaultHackathonId: string;
  onClose: () => void;
  onDone: (message: string | null, error: string | null) => void;
}) {
  const [hackathonId, setHackathonId] = useState(defaultHackathonId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pending = hackathonId
    ? teams.filter((t) => !isInHackathon(t, hackathonId))
    : [];
  const alreadyIn = teams.length - pending.length;
  const target = hackathons.find((h) => h.id === hackathonId);

  async function submit() {
    if (!hackathonId || pending.length === 0) return;
    setBusy(true);
    setError(null);
    const result = await runBulkSequential(
      pending.map((t) => t.id),
      (id) => attachTeam(hackathonId, id).then(() => undefined),
    );
    setBusy(false);
    const label = hackathonLabel(target);
    if (result.failed > 0) {
      onDone(
        null,
        `Add to ${label}: ${result.ok} ok, ${result.failed} failed${
          result.error ? ` (${result.error})` : ""
        }`,
      );
    } else {
      onDone(`Added ${result.ok} team(s) to ${label}.`, null);
    }
  }

  return (
    <ModalShell open onClose={onClose} ariaLabel="Add to hackathon">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Teams
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">
          Add to hackathon
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {teams.length === 1
            ? `Team "${teams[0].name}"`
            : `${teams.length} teams selected`}
        </p>
      </div>
      <div className="space-y-3 px-5 py-4">
        <FormSelect
          label="Hackathon"
          value={hackathonId}
          onChange={setHackathonId}
          required
        >
          <option value="">Select a hackathon…</option>
          {hackathons.map((h) => (
            <option key={h.id} value={h.id}>
              {hackathonLabel(h)}
            </option>
          ))}
        </FormSelect>
        {hackathonId && alreadyIn > 0 ? (
          <p className="text-xs text-[var(--text-muted)]">
            {pending.length === 0
              ? "All selected teams are already in this hackathon."
              : `${alreadyIn} already in this hackathon and will be skipped.`}
          </p>
        ) : null}
        {error ? <Alert variant="error">{error}</Alert> : null}
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          disabled={busy || !hackathonId || pending.length === 0}
          onClick={() => void submit()}
        >
          {busy ? "Adding…" : `Add ${pending.length} team(s)`}
        </Button>
      </div>
    </ModalShell>
  );
}

/** Bulk-link selected teams as created-for one or more hackathons (union). */
function SetCreatedForHackathonsModal({
  teams,
  hackathons,
  defaultHackathonIds,
  onClose,
  onDone,
}: {
  teams: EventTeam[];
  hackathons: Hackathon[];
  defaultHackathonIds?: string[];
  onClose: () => void;
  onDone: (message: string | null, error: string | null) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    defaultHackathonIds?.filter(Boolean) || [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  }

  async function submit() {
    if (selectedIds.length === 0 || teams.length === 0) return;
    setBusy(true);
    setError(null);
    const byId = new Map(teams.map((t) => [t.id, t]));
    const result = await runBulkSequential(
      teams.map((t) => t.id),
      async (id) => {
        const team = byId.get(id);
        if (!team) return;
        const merged = new Set([
          ...teamLinkedHackathonIds(team),
          ...selectedIds,
        ]);
        await updateTeam(null, id, { hackathon_ids: [...merged] });
      },
    );
    setBusy(false);
    if (result.failed > 0) {
      onDone(
        null,
        `Set created for: ${result.ok} ok, ${result.failed} failed${
          result.error ? ` (${result.error})` : ""
        }`,
      );
    } else {
      onDone(
        `Linked ${result.ok} team(s) to ${selectedIds.length} hackathon(s).`,
        null,
      );
    }
  }

  return (
    <ModalShell open onClose={onClose} ariaLabel="Set created for hackathons">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Teams
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">
          Set created for hackathons
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {teams.length === 1
            ? `Team "${teams[0].name}" — catalog “created for” only (does not add to playing).`
            : `${teams.length} teams — catalog “created for” only (does not add to playing).`}
        </p>
      </div>
      <div className="space-y-3 px-5 py-4">
        <div className="max-h-56 space-y-2 overflow-y-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-3">
          {hackathons.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No hackathons available.</p>
          ) : (
            hackathons.map((h) => (
              <FormCheckbox
                key={h.id}
                label={hackathonLabel(h)}
                checked={selectedIds.includes(h.id)}
                onChange={(checked) => toggle(h.id, checked)}
              />
            ))
          )}
        </div>
        {error ? <Alert variant="error">{error}</Alert> : null}
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          disabled={busy || selectedIds.length === 0}
          onClick={() => void submit()}
        >
          {busy
            ? "Saving…"
            : `Apply to ${teams.length} team(s)`}
        </Button>
      </div>
    </ModalShell>
  );
}

/**
 * Platform-level Teams: every team registered on the platform, optionally
 * filtered by hackathon, with "Add to hackathon" for attaching to any event.
 */
export function PlatformTeamsView() {
  const router = useRouter();
  const { confirm, prompt } = usePlatformDialog();
  const { canMutateEvent, isPlatformOperator } = useHaasAccess();

  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [referers, setReferers] = useState<RefererItem[]>([]);
  const [hackathonFilter, setHackathonFilter] = useState("");
  const [rows, setRows] = useState<EventTeam[]>([]);
  const { search, setSearch, debouncedSearch, focusId, clearDeepSearch } =
    useSectionSearch();
  const [membership, setMembership] = useState<MembershipFilter>("all");
  const [sideFilter, setSideFilter] = useState<SideFilter>("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [refererFilter, setRefererFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addTargets, setAddTargets] = useState<EventTeam[] | null>(null);
  const [createdForTargets, setCreatedForTargets] = useState<EventTeam[] | null>(
    null,
  );
  const [addMemberTarget, setAddMemberTarget] = useState<{
    teamId: string;
    teamName: string;
    hackathonId: string;
    memberUserIds: string[];
  } | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [shownCount, setShownCount] = useState(0);
  const onPaginationInfo = useCallback((info: { shown: number }) => {
    setShownCount(info.shown);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const [{ items }, refererRows] = await Promise.all([
          listHackathons({ show_deleted: "false" }),
          listReferers().catch(() => [] as RefererItem[]),
        ]);
        setHackathons(items);
        setReferers(refererRows);
      } catch (err) {
        redirectIfUnauthorized(err, router);
      }
    })();
  }, [router]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const teams = await listPlatformTeams({
        search: debouncedSearch || undefined,
        register_as: sideFilter || undefined,
        is_active:
          activeFilter === "active"
            ? "true"
            : activeFilter === "inactive"
              ? "false"
              : undefined,
        hackathon: hackathonFilter || undefined,
        referer: refererFilter || undefined,
      });
      setRows(
        teams.sort((a, b) => (a.name || "").localeCompare(b.name || "")),
      );
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Failed to load teams");
    } finally {
      setIsLoading(false);
    }
  }, [
    debouncedSearch,
    sideFilter,
    activeFilter,
    hackathonFilter,
    refererFilter,
    router,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const base = rows.filter((row) => {
      if (hackathonFilter && membership !== "all") {
        const added = isInHackathon(row, hackathonFilter);
        if (membership === "added" && !added) return false;
        if (membership === "not_added" && added) return false;
      }
      return true;
    });
    return applySectionSearch(base, debouncedSearch, focusId, teamRowSearchParts);
  }, [rows, hackathonFilter, membership, debouncedSearch, focusId]);

  const selectedRows = useMemo(
    () => filtered.filter((row) => selectedKeys.has(row.id)),
    [filtered, selectedKeys],
  );

  useEffect(() => {
    const visible = new Set(filtered.map((r) => r.id));
    setSelectedKeys((prev) => {
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [filtered]);

  const filterHackathon = hackathons.find((h) => h.id === hackathonFilter);

  function clearFilters() {
    clearDeepSearch();
    setHackathonFilter("");
    setMembership("all");
    setSideFilter("");
    setActiveFilter("all");
    setRefererFilter("");
  }

  function openCreate() {
    setModalMode("create");
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(teamId: string) {
    setModalMode("edit");
    setEditingId(teamId);
    setModalOpen(true);
  }

  async function onToggleActive(row: EventTeam) {
    const next = !(row.is_active === true);
    setBusyId(row.id);
    setError(null);
    try {
      await setTeamActive(null, row.id, next);
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : next
            ? "Failed to activate team"
            : "Failed to deactivate team",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function onToggleBlock(row: EventTeam) {
    setBusyId(row.id);
    setError(null);
    try {
      if (row.is_blocked) {
        await unblockPlatformTeam(row.id);
      } else {
        const reason = await prompt({
          title: "Block team",
          message: `Provide a reason for blocking ${row.name || row.team_code || "this team"}. Its members will be blocked too.`,
          label: "Block reason",
          defaultValue: "Blocked by administrator",
          confirmLabel: "Block",
        });
        if (reason == null) return;
        await blockPlatformTeam(row.id, reason);
      }
      await load();
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Block action failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onRemoveFromHackathon(row: EventTeam) {
    if (!hackathonFilter) return;
    const ok = await confirm({
      title: "Remove from event",
      message: `Remove team "${row.name}" from ${hackathonLabel(filterHackathon)}? The team stays on the platform and can be added again.`,
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    setBusyId(row.id);
    setError(null);
    try {
      await detachTeamFromHackathon(hackathonFilter, row.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove team");
    } finally {
      setBusyId(null);
    }
  }

  async function onRemovePlaying(row: EventTeam, hackathonId: string) {
    const event = (row.playing_in || []).find((h) => h.id === hackathonId);
    const ok = await confirm({
      title: "Remove from playing",
      message: `Remove team "${row.name || row.team_code || "team"}" from the playing roster of ${hackathonLabel(event || { id: hackathonId })}?`,
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    setBusyId(row.id);
    setError(null);
    try {
      await removePlayingTeam(hackathonId, row.id);
      setRows((prev) =>
        prev.map((t) =>
          t.id === row.id
            ? {
                ...t,
                playing_in: (t.playing_in || []).filter(
                  (h) => h.id !== hackathonId,
                ),
              }
            : t,
        ),
      );
      await load();
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(
        err instanceof Error ? err.message : "Failed to remove from playing",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function onRemoveCreatedFor(row: EventTeam, hackathonId: string) {
    const event =
      (row.created_for || []).find((h) => h.id === hackathonId) ||
      (row.created_in_hackathon?.id === hackathonId
        ? row.created_in_hackathon
        : { id: hackathonId });
    const ok = await confirm({
      title: "Remove created-for link",
      message: `Unlink team "${row.name || row.team_code || "team"}" from ${hackathonLabel(event)} as a created-for event? This does not remove them from the playing roster.`,
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    setBusyId(row.id);
    setError(null);
    try {
      const remaining = teamLinkedHackathonIds(row).filter(
        (id) => id !== hackathonId,
      );
      await updateTeam(null, row.id, { hackathon_ids: remaining });
      setRows((prev) =>
        prev.map((t) => {
          if (t.id !== row.id) return t;
          const nextCreated = (t.created_for || []).filter(
            (h) => h.id !== hackathonId,
          );
          const clearedPrimary =
            t.created_in === hackathonId ||
            t.created_in_hackathon?.id === hackathonId;
          const nextPrimary = clearedPrimary
            ? nextCreated[0]
              ? {
                  id: nextCreated[0].id,
                  name: nextCreated[0].name,
                  display_name: nextCreated[0].display_name,
                  playing_hackathon_id: null,
                }
              : null
            : t.created_in_hackathon;
          return {
            ...t,
            created_for: nextCreated,
            created_in: nextPrimary?.id ?? null,
            created_in_hackathon: nextPrimary,
            // playing_in intentionally unchanged
          };
        }),
      );
      await load();
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(
        err instanceof Error
          ? err.message
          : "Failed to remove created-for link",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function runBulk(
    label: string,
    ids: string[],
    worker: (id: string) => Promise<unknown>,
  ) {
    if (ids.length === 0) return;
    setBulkBusy(true);
    setError(null);
    setInfo(null);
    try {
      const result = await runBulkSequential(ids, (id) =>
        worker(id).then(() => undefined),
      );
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
    void runBulk(
      active ? "Activate" : "Deactivate",
      selectedRows.map((r) => r.id),
      (id) => setTeamActive(null, id, active),
    );
  }

  async function bulkPolicy(action: "apply" | "delete") {
    const ids = selectedRows.map((r) => r.id);
    if (ids.length === 0) return;
    if (action === "delete") {
      const ok = await confirm({
        title: "Delete network policy",
        message: `Delete the network policy for ${ids.length} team(s)?`,
        confirmLabel: "Delete policy",
        destructive: true,
      });
      if (!ok) return;
    }
    const byId = new Map(selectedRows.map((r) => [r.id, r]));
    void runBulk(action === "apply" ? "Apply policy" : "Delete policy", ids, (id) =>
      action === "apply"
        ? applyTeamNetworkPolicyEnsuringPool(null, byId.get(id)!)
        : deleteTeamNetworkPolicy(null, id),
    );
  }

  async function onApplyPolicy(row: EventTeam) {
    setBusyId(row.id);
    setError(null);
    setInfo(null);
    try {
      await applyTeamNetworkPolicyEnsuringPool(null, row);
      setInfo(`Network policy applied for "${row.name}".`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply network policy");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function onDeletePolicy(row: EventTeam) {
    const ok = await confirm({
      title: "Delete network policy",
      message: `Delete the network policy for "${row.name}"?`,
      confirmLabel: "Delete policy",
      destructive: true,
    });
    if (!ok) return;
    setBusyId(row.id);
    setError(null);
    setInfo(null);
    try {
      await deleteTeamNetworkPolicy(null, row.id);
      setInfo(`Network policy deleted for "${row.name}".`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete network policy");
    } finally {
      setBusyId(null);
    }
  }

  async function onAssignPool(row: EventTeam) {
    if (row.is_blocked) {
      setError("Unblock the team before assigning an IP pool.");
      return;
    }
    const ok = await confirm({
      title: "Assign IP pool",
      message: `Assign an IP pool to "${row.name}"? The team will be deactivated and reactivated so Kubernetes can provision a namespace and pool.`,
      confirmLabel: "Assign pool",
    });
    if (!ok) return;
    setBusyId(row.id);
    setError(null);
    setInfo(null);
    try {
      await provisionTeamIpPool(null, row.id);
      setInfo(
        `IP pool provisioning started for "${row.name}". Refresh if the pool does not appear immediately.`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign IP pool");
    } finally {
      setBusyId(null);
    }
  }

  function canManageTeam(row: EventTeam) {
    if (isPlatformOperator) return true;
    const eventId = memberHackathonId(row, hackathonFilter);
    return Boolean(eventId && canMutateEvent(eventId));
  }

  const addedCount = hackathonFilter
    ? rows.filter((r) => isInHackathon(r, hackathonFilter)).length
    : 0;
  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(focusId) ||
    Boolean(hackathonFilter) ||
    membership !== "all" ||
    Boolean(sideFilter) ||
    activeFilter !== "all" ||
    Boolean(refererFilter);

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Platform"
        title="Teams"
        actions={
          <Button size="sm" onClick={openCreate}>
            Create team
          </Button>
        }
      />

      <StickyToolbar
        footer={
          <ListPageStats>
            <ListPageStat label="Total" value={rows.length} />
            <ListPageStatsDot />
            <ListPageStat label="Shown" value={shownCount} />
            {hackathonFilter ? (
              <>
                <ListPageStatsDot />
                <ListPageStat label="Approved" value={addedCount} tone="accent" />
                <ListPageStatsDot />
                <ListPageStat
                  label="Not approved"
                  value={rows.length - addedCount}
                  tone="warning"
                />
              </>
            ) : null}
            {debouncedSearch || focusId ? (
              <>
                <ListPageStatsDot />
                <span className="text-[var(--accent)]">
                  {focusId ? "Deep search result" : `Matching “${debouncedSearch}”`}
                </span>
              </>
            ) : null}
          </ListPageStats>
        }
      >
        <FilterSelect
          label="Hackathon"
          value={hackathonFilter}
          onChange={(v) => {
            setHackathonFilter(v);
            if (!v) setMembership("all");
          }}
          className="min-w-[180px]"
        >
          <option value="">All hackathons</option>
          {hackathons.map((h) => (
            <option key={h.id} value={h.id}>
              {hackathonLabel(h)}
            </option>
          ))}
        </FilterSelect>

        <FilterTextField
          label="Search"
          name="search"
          value={search}
          onChange={setSearch}
          placeholder="Name, code…"
        />

        {hackathonFilter ? (
          <FilterSelect
            label="Approved For Playing"
            value={membership}
            onChange={(v) => setMembership(v as MembershipFilter)}
          >
            <option value="all">All</option>
            <option value="added">Approved</option>
            <option value="not_added">Not approved</option>
          </FilterSelect>
        ) : null}

        <FilterSelect
          label="Side"
          value={sideFilter}
          onChange={(v) => setSideFilter(v as SideFilter)}
        >
          <option value="">All</option>
          <option value="red">red</option>
          <option value="blue">blue</option>
          <option value="mix">mix</option>
        </FilterSelect>

        <FilterSelect
          label="Active"
          value={activeFilter}
          onChange={(v) => setActiveFilter(v as ActiveFilter)}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </FilterSelect>

        <FilterSelect
          label="Referer"
          value={refererFilter}
          onChange={setRefererFilter}
        >
          <option value="">All</option>
          <option value="none">Unset</option>
          {referers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
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

      <TeamFormModal
        open={modalOpen}
        mode={modalMode}
        hackathonId={null}
        teamId={editingId}
        hackathons={hackathons}
        onClose={() => {
          setModalOpen(false);
          setEditingId(null);
        }}
        onSaved={() => void load()}
      />

      {addTargets ? (
        <AddToHackathonModal
          teams={addTargets}
          hackathons={hackathons}
          defaultHackathonId={hackathonFilter}
          onClose={() => setAddTargets(null)}
          onDone={(message, err) => {
            setAddTargets(null);
            setSelectedKeys(new Set());
            setInfo(message);
            setError(err);
            void load();
          }}
        />
      ) : null}

      {createdForTargets ? (
        <SetCreatedForHackathonsModal
          teams={createdForTargets}
          hackathons={hackathons}
          defaultHackathonIds={hackathonFilter ? [hackathonFilter] : []}
          onClose={() => setCreatedForTargets(null)}
          onDone={(message, err) => {
            setCreatedForTargets(null);
            setSelectedKeys(new Set());
            setInfo(message);
            setError(err);
            void load();
          }}
        />
      ) : null}

      {addMemberTarget ? (
        <AddTeamMemberModal
          open
          hackathonId={addMemberTarget.hackathonId}
          teamId={addMemberTarget.teamId}
          teamName={addMemberTarget.teamName}
          currentMemberUserIds={addMemberTarget.memberUserIds}
          onClose={() => setAddMemberTarget(null)}
          onSaved={() => void load()}
        />
      ) : null}

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

      <BulkActionBar
        selectedCount={selectedKeys.size}
        busy={bulkBusy}
        onClear={() => setSelectedKeys(new Set())}
        actions={[
          {
            id: "add",
            label: "Add to hackathon…",
            onClick: () => setAddTargets(selectedRows),
          },
          {
            id: "created-for",
            label: "Set created for…",
            onClick: () => setCreatedForTargets(selectedRows),
          },
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
            id: "policy-apply",
            label: "Apply policy",
            onClick: () => void bulkPolicy("apply"),
          },
          {
            id: "policy-delete",
            label: "Delete policy",
            onClick: () => void bulkPolicy("delete"),
          },
        ]}
      />

      <DataTable
        isLoading={isLoading}
        rows={filtered}
        rowKey={(r) => r.id}
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        onPaginationInfo={onPaginationInfo}
        emptyMessage={
          hasActiveFilters ? "No teams match your filters." : "No teams registered yet."
        }
        columns={[
          {
            key: "name",
            header: "Team",
            className: "min-w-[10rem]",
            render: (row) => (
              <div className="flex items-center gap-2">
                <Avatar
                  src={row.team_picture_url}
                  name={row.name}
                  size="sm"
                  rounded="md"
                />
                <div className="min-w-0">
                  <div className="max-w-[9rem] truncate text-sm font-medium">
                    {row.name}
                  </div>
                  <div
                    className="max-w-[9rem] truncate font-mono text-[10px] text-[var(--text-muted)]"
                    title={row.team_code || row.id}
                  >
                    {row.team_code || row.id}
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "members",
            header: "Members",
            wrap: true,
            className: "min-w-[9rem] max-w-[14rem]",
            render: (row) => {
              const members = row.members || [];
              const eventId = memberHackathonId(row, hackathonFilter);
              const memberUserIds = members
                .map((m) => m.user_detail?.id || m.user || null)
                .filter((id): id is string => Boolean(id));
              return (
                <TeamMembersCell
                  members={members}
                  memberCount={
                    typeof row.member_count === "number"
                      ? row.member_count
                      : members.length
                  }
                  hackathonId={eventId}
                  teamId={row.id}
                  teamName={row.name || row.team_code || "Team"}
                  canAdd={Boolean(eventId && canMutateEvent(eventId))}
                  canRemove={Boolean(eventId && canMutateEvent(eventId))}
                  onAdd={
                    eventId
                      ? () =>
                          setAddMemberTarget({
                            teamId: row.id,
                            teamName: row.name || row.team_code || "Team",
                            hackathonId: eventId,
                            memberUserIds,
                          })
                      : undefined
                  }
                  onRemoved={() => void load()}
                />
              );
            },
          },
          {
            key: "ip_pool",
            header: "IP",
            className: "max-w-[7.5rem]",
            render: (row) => {
              const pool = row.ip_pool || row.pool_ip || row.subnet || null;
              if (pool) {
                return (
                  <span
                    className="block max-w-[7rem] truncate font-mono text-[11px]"
                    title={pool}
                  >
                    {pool}
                  </span>
                );
              }
              if (!row.is_blocked && canManageTeam(row)) {
                return (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-6 px-2 text-[10px]"
                    disabled={busyId === row.id}
                    onClick={() => void onAssignPool(row)}
                  >
                    {busyId === row.id ? "…" : "Assign"}
                  </Button>
                );
              }
              return <span className="text-[var(--text-muted)]">—</span>;
            },
          },
          {
            key: "namespace",
            header: "NS",
            className: "max-w-[7rem]",
            render: (row) => (
              <span
                className="block max-w-[6.5rem] truncate font-mono text-[11px]"
                title={row.namespace || row.name_code || undefined}
              >
                {row.namespace || row.name_code || "—"}
              </span>
            ),
          },
          {
            key: "network_policy",
            header: "Policy",
            render: (row) => (
              <TeamNetworkPolicyCell
                team={row}
                busy={busyId === row.id}
                canManage={canManageTeam(row)}
                onApply={() => void onApplyPolicy(row)}
                onDelete={() => void onDeletePolicy(row)}
              />
            ),
          },
          {
            key: "register_as",
            header: "Side",
            render: (row) =>
              row.register_as || (
                <span className="text-[var(--text-muted)]">—</span>
              ),
          },
          {
            key: "team_type",
            header: "Type",
            render: (row) => {
              const label =
                row.team_type === "testing"
                  ? "Testing"
                  : row.team_type === "load_testing"
                    ? "Load testing"
                    : row.team_type === "actual"
                      ? "Actual"
                      : row.team_type || "Actual";
              return (
                <span className="text-xs text-[var(--text-muted)]">{label}</span>
              );
            },
          },
          {
            key: "referer",
            header: "Referer",
            render: (row) =>
              row.referer_detail?.name || row.referer_detail?.slug || (
                <span className="text-[var(--text-muted)]">—</span>
              ),
          },
          {
            key: "created_for",
            header: "Created for",
            wrap: true,
            className: "min-w-[7rem] max-w-[12rem]",
            render: (row) => {
              const events =
                row.created_for && row.created_for.length > 0
                  ? row.created_for
                  : row.created_in_hackathon?.id
                    ? [
                        {
                          id: row.created_in_hackathon.id,
                          name: row.created_in_hackathon.name,
                          display_name: row.created_in_hackathon.display_name,
                        },
                      ]
                    : [];
              return (
                <PlayingInChips
                  events={events}
                  busy={busyId === row.id}
                  emptyLabel="Platform only"
                  onRemove={(hackathonId) =>
                    void onRemoveCreatedFor(row, hackathonId)
                  }
                />
              );
            },
          },
          {
            key: "playing_in",
            header: "Playing in",
            wrap: true,
            className: "min-w-[10rem] max-w-[16rem]",
            render: (row) => (
              <PlayingInChips
                events={row.playing_in || []}
                busy={busyId === row.id}
                emptyLabel="Not on any playing roster"
                onRemove={(hackathonId) =>
                  void onRemovePlaying(row, hackathonId)
                }
              />
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (row) => (
              <div className="flex flex-wrap items-center gap-1">
                {row.is_blocked ? <Badge tone="danger">Blocked</Badge> : null}
                {row.is_active === false ? (
                  <Badge tone="warning">Inactive</Badge>
                ) : (
                  <Badge tone="success">Active</Badge>
                )}
              </div>
            ),
          },
          {
            key: "actions",
            header: "",
            sticky: "right",
            className: "text-right w-12",
            render: (row) => (
              <RowActionsMenu
                label={`Actions for ${row.name || row.team_code || "team"}`}
                items={[
                  {
                    id: "edit",
                    label: "Edit",
                    disabled: busyId === row.id,
                    onClick: () => openEdit(row.id),
                  },
                  {
                    id: "add",
                    label: "Add to hackathon…",
                    disabled: busyId === row.id,
                    onClick: () => setAddTargets([row]),
                  },
                  {
                    id: "created-for",
                    label: "Set created for…",
                    disabled: busyId === row.id,
                    onClick: () => setCreatedForTargets([row]),
                  },
                  {
                    id: "toggle-active",
                    label: row.is_active === true ? "Deactivate" : "Activate",
                    disabled: busyId === row.id,
                    onClick: () => void onToggleActive(row),
                  },
                  {
                    id: "toggle-block",
                    label: row.is_blocked ? "Unblock" : "Block",
                    disabled: busyId === row.id || !canManageTeam(row),
                    onClick: () => void onToggleBlock(row),
                  },
                  ...(hackathonFilter && isInHackathon(row, hackathonFilter)
                    ? [
                        {
                          id: "remove",
                          label: busyId === row.id ? "Removing…" : "Remove from hackathon",
                          disabled: busyId === row.id,
                          onClick: () => void onRemoveFromHackathon(row),
                        },
                      ]
                    : []),
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
