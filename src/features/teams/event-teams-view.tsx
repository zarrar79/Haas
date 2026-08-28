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
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { FilterSelect, StickyToolbar } from "@/components/ui/sticky-toolbar";
import { TextField } from "@/components/ui/text-field";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { listHackathons } from "@/features/hackathons/hackathon-api";
import {
  attachTeam,
  blockTeam,
  createTeam,
  detachTeamFromHackathon,
  getTeam,
  listAllTeams,
  listPlayingTeams,
  listTeams,
  removeTeam,
  setTeamActive,
  unblockTeam,
  updateTeam,
  type EventTeam,
  type TeamMember,
} from "@/features/teams/team-api";
import { ApiRequestError } from "@/lib/client-api";
import type { Hackathon } from "@/types/hackathon";

const ALL_HACKATHONS = "__all__";

type MembershipFilter = "all" | "added" | "not_added";
type SideFilter = "" | "red" | "blue" | "mix";
type ActiveFilter = "all" | "active" | "inactive";

type Row = EventTeam & {
  isAdded: boolean;
  createdInName?: string | null;
};

type EventTeamsViewProps = {
  hackathonId?: string;
  syncUrl?: boolean;
};

function memberLabel(m: TeamMember) {
  const d = m.user_detail;
  const name = [d?.name, d?.last_name].filter(Boolean).join(" ").trim();
  return name || d?.username || d?.email || m.user || m.id;
}

function TeamFormModal({
  open,
  mode,
  hackathonId,
  teamId,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "create" | "edit";
  hackathonId?: string | null;
  teamId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [website, setWebsite] = useState("");
  const [registerAs, setRegisterAs] = useState("red");
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "create" || !teamId) {
      setName("");
      setDescription("");
      setAffiliation("");
      setWebsite("");
      setRegisterAs("red");
      setIsActive(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getTeam(hackathonId, teamId)
      .then((team) => {
        if (cancelled) return;
        setName(team.name || "");
        setDescription(team.description || "");
        setAffiliation(team.affiliation || "");
        setWebsite(team.website || "");
        setRegisterAs(team.register_as || "red");
        setIsActive(team.is_active !== false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load team");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, mode, teamId, hackathonId]);

  async function submit() {
    if (!name.trim()) {
      setError("Team name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === "edit" && teamId) {
        await updateTeam(hackathonId, teamId, {
          name: name.trim(),
          description: description.trim() || undefined,
          affiliation: affiliation.trim() || undefined,
          website: website.trim() || undefined,
          register_as: registerAs || undefined,
          is_active: isActive,
        });
      } else {
        await createTeam(hackathonId, {
          name: name.trim(),
          description: description.trim() || undefined,
          affiliation: affiliation.trim() || undefined,
          register_as: registerAs || undefined,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : mode === "edit"
            ? "Failed to update team"
            : "Failed to create team",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--overlay)]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Teams
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">
              {mode === "edit" ? "Edit team" : "Create team"}
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {hackathonId
                ? "Scoped to the selected hackathon."
                : "Platform catalog (Root / system.admin)."}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="space-y-3 px-5 py-4">
          {error ? <Alert variant="error">{error}</Alert> : null}
          {loading ? (
            <p className="text-sm text-[var(--text-muted)]">Loading…</p>
          ) : (
            <>
              <TextField
                label="Name *"
                name="team_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
                <span className="font-medium text-[var(--text)]">Register as</span>
                <select
                  className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
                  value={registerAs}
                  onChange={(e) => setRegisterAs(e.target.value)}
                >
                  <option value="red">red</option>
                  <option value="blue">blue</option>
                  <option value="mix">mix</option>
                </select>
              </label>
              <TextField
                label="Affiliation"
                name="affiliation"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
              />
              {mode === "edit" ? (
                <TextField
                  label="Website"
                  name="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              ) : null}
              <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
                <span className="font-medium text-[var(--text)]">Description</span>
                <textarea
                  className="min-h-[80px] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              {mode === "edit" ? (
                <label className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-3 text-sm text-[var(--text)]">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <span>
                    <strong>Active</strong>
                    <span className="mt-1 block text-xs text-[var(--text-muted)]">
                      Inactive teams stay listed so you can reactivate them.
                    </span>
                  </span>
                </label>
              ) : null}
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            disabled={busy || loading || !name.trim()}
            onClick={() => void submit()}
          >
            {busy
              ? mode === "edit"
                ? "Saving…"
                : "Creating…"
              : mode === "edit"
                ? "Save changes"
                : "Create team"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EventTeamsView({
  hackathonId: hackathonIdProp,
  syncUrl = true,
}: EventTeamsViewProps) {
  const router = useRouter();
  const { setSelectedHackathonId } = useSelectedEvent();

  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [activeId, setActiveId] = useState(hackathonIdProp || ALL_HACKATHONS);
  const isAllScope = activeId === ALL_HACKATHONS || !activeId;

  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [membership, setMembership] = useState<MembershipFilter>("all");
  const [sideFilter, setSideFilter] = useState<SideFilter>("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [catalogLimited, setCatalogLimited] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
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

  const apiFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      register_as: sideFilter || undefined,
      is_active:
        activeFilter === "active"
          ? "true"
          : activeFilter === "inactive"
            ? "false"
            : undefined,
      limit: "100",
    }),
    [debouncedSearch, sideFilter, activeFilter],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setInfo(null);

    try {
      let allTeams: EventTeam[] = [];
      let addedIds = new Set<string>();
      let limited = false;

      if (isAllScope) {
        try {
          allTeams = await listAllTeams(apiFilters);
        } catch (err) {
          if (err instanceof ApiRequestError && err.httpStatus === 401) {
            router.replace("/login");
            return;
          }
          if (err instanceof ApiRequestError && err.httpStatus === 403) {
            setError(
              "Listing all teams requires Root / system.admin. Select a hackathon instead.",
            );
            setRows([]);
            setCatalogLimited(true);
            return;
          }
          throw err;
        }
        setInfo("Showing all platform teams (in any hackathon or none).");
      } else {
        try {
          allTeams = await listAllTeams(apiFilters);
        } catch (err) {
          if (err instanceof ApiRequestError && err.httpStatus === 403) {
            limited = true;
            try {
              allTeams = await listTeams(activeId, apiFilters);
              limited = false;
            } catch {
              // Fall back below.
            }
          } else if (err instanceof ApiRequestError && err.httpStatus === 401) {
            router.replace("/login");
            return;
          } else {
            throw err;
          }
        }

        // Event catalog (created-in / linked) so removed teams stay visible.
        const eventCatalog = await listTeams(activeId, {
          search: debouncedSearch || undefined,
          limit: "100",
        });
        for (const team of eventCatalog) {
          if (!allTeams.some((t) => t.id === team.id)) {
            allTeams.push(team);
          }
        }

        // "Added" = on the live playing roster only.
        const playing = await listPlayingTeams(activeId, {
          search: debouncedSearch || undefined,
          limit: "100",
        });
        addedIds = new Set(playing.map((t) => t.id));

        if (limited) {
          setInfo(
            "Showing teams for this event. Full platform catalog requires Root / system.admin.",
          );
        }
      }

      setCatalogLimited(limited);

      const merged = new Map<string, Row>();
      for (const team of allTeams) {
        merged.set(team.id, {
          ...team,
          isAdded: isAllScope ? false : addedIds.has(team.id),
          createdInName:
            team.created_in_hackathon?.display_name ||
            team.created_in_hackathon?.name ||
            null,
        });
      }

      setRows(
        Array.from(merged.values()).sort((a, b) =>
          (a.name || "").localeCompare(b.name || ""),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams");
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
      if (sideFilter && row.register_as !== sideFilter) return false;
      if (activeFilter === "active" && row.is_active === false) return false;
      if (activeFilter === "inactive" && row.is_active !== false) return false;
      return true;
    });
  }, [rows, membership, sideFilter, activeFilter, isAllScope]);

  function clearFilters() {
    setSearch("");
    setMembership("all");
    setSideFilter("");
    setActiveFilter("all");
  }

  function onHackathonChange(nextId: string) {
    setActiveId(nextId || ALL_HACKATHONS);
    if (nextId && nextId !== ALL_HACKATHONS) {
      setSelectedHackathonId(nextId);
      if (syncUrl) router.push(`/events/${nextId}/teams`);
    } else if (syncUrl) {
      router.push("/teams");
    }
  }

  function scopeHackathonId() {
    return isAllScope ? null : activeId;
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

  async function onAdd(teamId: string) {
    if (isAllScope) {
      setError("Select a hackathon first to add a team to an event.");
      return;
    }
    setBusyId(teamId);
    setError(null);
    try {
      await attachTeam(activeId, teamId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add team");
    } finally {
      setBusyId(null);
    }
  }

  async function onToggleActive(row: Row) {
    const next = !(row.is_active === true);
    setBusyId(row.id);
    setError(null);
    try {
      await setTeamActive(scopeHackathonId(), row.id, next);
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

  async function onBlock(row: Row) {
    if (isAllScope) {
      setError("Select a hackathon to block a team in that event.");
      return;
    }
    const reason = window.prompt("Block reason", "Blocked in HAS admin");
    if (reason == null) return;
    setBusyId(row.id);
    try {
      await blockTeam(activeId, row.id, reason);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to block");
    } finally {
      setBusyId(null);
    }
  }

  async function onUnblock(row: Row) {
    if (isAllScope) return;
    setBusyId(row.id);
    try {
      await unblockTeam(activeId, row.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unblock");
    } finally {
      setBusyId(null);
    }
  }

  async function onRemoveFromHackathon(row: Row) {
    if (isAllScope) return;
    if (
      !window.confirm(
        `Remove team "${row.name}" from this hackathon? You can Add it again anytime.`,
      )
    ) {
      return;
    }
    setBusyId(row.id);
    setError(null);
    try {
      await detachTeamFromHackathon(activeId, row.id);
      // Flip locally so Add shows immediately, then refresh.
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, isAdded: false } : r)),
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove team");
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(row: Row) {
    if (
      !window.confirm(
        `Delete team "${row.name}"? This soft-deactivates the team.`,
      )
    ) {
      return;
    }
    setBusyId(row.id);
    setError(null);
    try {
      await removeTeam(scopeHackathonId(), row.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete team");
    } finally {
      setBusyId(null);
    }
  }

  function onRowDoubleClick(row: Row) {
    if (isAllScope || row.isAdded || busyId) return;
    void onAdd(row.id);
  }

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
    const ids = selectedRows.map((r) => r.id);
    void runBulk(active ? "Activate" : "Deactivate", ids, (id) =>
      setTeamActive(scopeHackathonId(), id, active).then(() => undefined),
    );
  }

  function bulkDelete() {
    const ids = selectedRows.map((r) => r.id);
    if (
      !window.confirm(
        isAllScope
          ? `Delete ${ids.length} selected team(s)? This soft-deactivates them.`
          : `Deactivate ${ids.length} selected team(s)?`,
      )
    ) {
      return;
    }
    if (isAllScope) {
      void runBulk("Delete", ids, (id) =>
        removeTeam(null, id).then(() => undefined),
      );
      return;
    }
    void runBulk("Deactivate", ids, (id) =>
      setTeamActive(activeId, id, false).then(() => undefined),
    );
  }

  function bulkAdd() {
    if (isAllScope) return;
    const ids = selectedRows.filter((r) => !r.isAdded).map((r) => r.id);
    if (ids.length === 0) {
      setError("No selected teams are available to add.");
      return;
    }
    void runBulk("Add", ids, (id) =>
      attachTeam(activeId, id).then(() => undefined),
    );
  }

  function bulkRemoveFromEvent() {
    if (isAllScope) return;
    const ids = selectedRows.filter((r) => r.isAdded).map((r) => r.id);
    if (ids.length === 0) {
      setError("No selected teams are attached to remove.");
      return;
    }
    if (
      !window.confirm(
        `Remove ${ids.length} team(s) from this hackathon? You can Add them again later.`,
      )
    ) {
      return;
    }
    void runBulk("Remove", ids, (id) =>
      detachTeamFromHackathon(activeId, id).then(() => undefined),
    );
  }

  const addedCount = rows.filter((r) => r.isAdded).length;
  const notAddedCount = rows.length - addedCount;
  const hasActiveFilters =
    Boolean(search.trim()) ||
    membership !== "all" ||
    Boolean(sideFilter) ||
    activeFilter !== "all";

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Event workspace"
        title="Teams"
        description="Browse all teams or scope to one hackathon. Create, add, edit, activate, or remove."
        actions={
          <>
            <Button variant="secondary" onClick={() => void load()}>
              Refresh
            </Button>
            <Button onClick={openCreate}>Create team</Button>
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
          <option value={ALL_HACKATHONS}>All teams</option>
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
            placeholder="Name, code…"
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

      <TeamFormModal
        open={modalOpen}
        mode={modalMode}
        hackathonId={scopeHackathonId()}
        teamId={editingId}
        onClose={() => {
          setModalOpen(false);
          setEditingId(null);
        }}
        onSaved={() => void load()}
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
          Tip: double-click a{" "}
          <span className="text-[var(--warning)]">Not added</span> row to attach
          it to this hackathon.
        </p>
      ) : null}

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

      <DataTable
        isLoading={isLoading}
        rows={filtered}
        rowKey={(r) => r.id}
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        onRowDoubleClick={onRowDoubleClick}
        emptyMessage={
          catalogLimited && !hasActiveFilters
            ? "No teams to show."
            : "No teams match your filters."
        }
        columns={[
          {
            key: "name",
            header: "Team",
            render: (row) => (
              <div
                className={
                  !isAllScope && !row.isAdded ? "cursor-pointer" : undefined
                }
              >
                <div className="font-medium">{row.name}</div>
                <div className="font-mono text-[10px] text-[var(--text-muted)]">
                  {row.team_code || row.id}
                </div>
              </div>
            ),
          },
          {
            key: "ip_pool",
            header: "IP pool",
            render: (row) => (
              <span className="font-mono text-xs">
                {row.ip_pool || row.pool_ip || row.subnet || "—"}
              </span>
            ),
          },
          {
            key: "namespace",
            header: "Namespace",
            render: (row) => (
              <span className="font-mono text-xs">
                {row.namespace || row.name_code || "—"}
              </span>
            ),
          },
          {
            key: "members",
            header: "Members",
            render: (row) => {
              const members = row.members || [];
              const count =
                typeof row.member_count === "number"
                  ? row.member_count
                  : members.length;
              if (count === 0) {
                return <span className="text-[var(--text-muted)]">0</span>;
              }
              const labels = members.slice(0, 3).map(memberLabel);
              const extra = count > labels.length ? count - labels.length : 0;
              return (
                <div className="max-w-[220px]">
                  <div className="text-xs font-medium">{count}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {labels.join(", ")}
                    {extra > 0 ? ` +${extra}` : ""}
                  </div>
                </div>
              );
            },
          },
          {
            key: "created_in",
            header: "Created in",
            render: (row) =>
              row.createdInName || (
                <span className="text-[var(--text-muted)]">—</span>
              ),
          },
          {
            key: "status",
            header: "Status",
            render: (row) => (
              <div className="flex flex-wrap gap-1">
                {row.is_blocked ? <Badge tone="danger">Blocked</Badge> : null}
                {row.is_active === false ? (
                  <Badge tone="warning">Inactive</Badge>
                ) : (
                  <Badge tone="success">Active</Badge>
                )}
              </div>
            ),
          },
          ...(!isAllScope
            ? [
                {
                  key: "membership",
                  header: "In this hackathon",
                  render: (row: Row) =>
                    row.isAdded ? (
                      <Badge tone="success">Added</Badge>
                    ) : (
                      <Badge tone="warning">Not added</Badge>
                    ),
                },
              ]
            : []),
          {
            key: "actions",
            header: "Actions",
            className: "text-right",
            render: (row) => (
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyId === row.id}
                  onClick={() => openEdit(row.id)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyId === row.id}
                  onClick={() => void onToggleActive(row)}
                >
                  {row.is_active === true ? "Deactivate" : "Activate"}
                </Button>
                {!isAllScope ? (
                  row.isAdded ? (
                    <>
                      {row.is_blocked ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busyId === row.id}
                          onClick={() => void onUnblock(row)}
                        >
                          Unblock
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busyId === row.id}
                          onClick={() => void onBlock(row)}
                        >
                          Block
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === row.id}
                        onClick={() => void onRemoveFromHackathon(row)}
                      >
                        {busyId === row.id ? "Removing…" : "Remove"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      disabled={busyId === row.id}
                      onClick={() => void onAdd(row.id)}
                    >
                      {busyId === row.id ? "Adding…" : "Add"}
                    </Button>
                  )
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === row.id}
                    onClick={() => void onDelete(row)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
