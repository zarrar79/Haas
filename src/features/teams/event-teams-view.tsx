"use client";

import Link from "next/link";
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
import { ModalShell } from "@/components/ui/modal-shell";
import { DataTable } from "@/components/ui/data-table";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { PageHeader } from "@/components/ui/page-header";
import {
  ListPageStat,
  ListPageStats,
  ListPageStatsDot,
} from "@/components/ui/list-page-stats";
import { FormSkeleton } from "@/components/ui/skeleton";
import { FilterSelect, StickyToolbar } from "@/components/ui/sticky-toolbar";
import { TextField } from "@/components/ui/text-field";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { useEffectiveHackathonId } from "@/features/events/use-effective-hackathon-id";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import { useSectionSearch, applySectionSearch, teamRowSearchParts } from "@/features/search/section-search";
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
  provisionTeamIpPool,
  setTeamActive,
  unblockTeam,
  updateTeam,
  type EventTeam,
  type TeamMember,
} from "@/features/teams/team-api";
import {
  AddTeamMemberModal,
  MAX_TEAM_MEMBERS,
} from "@/features/teams/add-team-member-modal";
import { TeamEditMembersPanel } from "@/features/teams/team-edit-members-panel";
import { eventUserDetailPath } from "@/features/users/users-api";
import { ApiRequestError } from "@/lib/client-api";
import type { Hackathon } from "@/types/hackathon";

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

function memberUserId(m: TeamMember) {
  return m.user_detail?.id || m.user || null;
}

function TeamMembersCell({
  members,
  memberCount,
  hackathonId,
  canAdd,
  onAdd,
}: {
  members: TeamMember[];
  memberCount: number;
  hackathonId: string | null;
  canAdd: boolean;
  onAdd?: () => void;
}) {
  const showAdd = canAdd && hackathonId && memberCount < MAX_TEAM_MEMBERS;
  const visible = members.slice(0, 5);
  const extra = memberCount > visible.length ? memberCount - visible.length : 0;

  return (
    <div className="max-w-[260px] flex items-center gap-2">
      <div className="flex items-center gap-2">
        {/* <span className="text-xs font-medium">{memberCount}</span> */}
      </div>
      {memberCount > 0 ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {visible.map((member) => {
            const userId = memberUserId(member);
            const label = memberLabel(member);
            if (hackathonId && userId) {
              return (
                <Link
                  key={member.id}
                  href={eventUserDetailPath(hackathonId, userId)}
                  className="rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {label}
                </Link>
              );
            }
            return (
              <span
                key={member.id}
                className="rounded-full bg-[var(--surface-hover)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]"
              >
                {label}
              </span>
            );
          })}
          {extra > 0 ? (
            <span className="text-[10px] text-[var(--text-muted)]">+{extra}</span>
          ) : null}
        </div>
      ) : showAdd ? null : (
        <span className="mt-1 text-[10px] text-[var(--text-muted)]">No members</span>
      )}
      {showAdd && onAdd ? (
          <Button
            size="sm"
            variant="secondary"
            className="h-6 px-2 text-[10px]"
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
          >
            Add
          </Button>
        ) : null}
    </div>
  );
}

function TeamFormModal({
  open,
  mode,
  hackathonId,
  teamId,
  canManageMembers,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "create" | "edit";
  hackathonId?: string | null;
  teamId?: string | null;
  canManageMembers?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [website, setWebsite] = useState("");
  const [registerAs, setRegisterAs] = useState("red");
  const [isActive, setIsActive] = useState(true);
  const [pictureUrl, setPictureUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [clearPicture, setClearPicture] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setImageFile(null);
    setClearPicture(false);
    if (mode === "create" || !teamId) {
      setName("");
      setDescription("");
      setAffiliation("");
      setWebsite("");
      setRegisterAs("red");
      setIsActive(true);
      setPictureUrl(null);
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
        setPictureUrl(team.team_picture_url || null);
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
        await updateTeam(
          hackathonId,
          teamId,
          {
            name: name.trim(),
            description: description.trim() || undefined,
            affiliation: affiliation.trim() || undefined,
            website: website.trim() || undefined,
            register_as: registerAs || undefined,
            is_active: isActive,
          },
          { file: imageFile, clearPicture },
        );
      } else {
        await createTeam(
          hackathonId,
          {
            name: name.trim(),
            description: description.trim() || undefined,
            affiliation: affiliation.trim() || undefined,
            register_as: registerAs || undefined,
          },
          { file: imageFile },
        );
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

  const showMembers = mode === "edit" && Boolean(hackathonId && teamId);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      panelClassName={showMembers ? "max-w-2xl" : "max-w-lg"}
      ariaLabel={mode === "edit" ? "Edit team" : "Create team"}
    >
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
        <div className="space-y-3 overflow-y-auto px-5 py-4">
          {error ? <Alert variant="error">{error}</Alert> : null}
          {loading ? (
            <FormSkeleton fields={5} />
          ) : (
            <>
              <ImageUploadField
                label="Team image"
                currentUrl={pictureUrl}
                name={name}
                file={imageFile}
                clearRequested={clearPicture}
                onFileChange={setImageFile}
                onClearChange={setClearPicture}
                rounded="md"
              />
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
              {showMembers ? (
                <TeamEditMembersPanel
                  hackathonId={hackathonId!}
                  teamId={teamId!}
                  teamName={name.trim() || "Team"}
                  canManage={Boolean(canManageMembers)}
                  onChanged={onSaved}
                />
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
    </ModalShell>
  );
}

export function EventTeamsView({
  hackathonId: hackathonIdProp,
  syncUrl = true,
}: EventTeamsViewProps) {
  const router = useRouter();
  const { confirm, prompt } = usePlatformDialog();
  const { setSelectedHackathonId } = useSelectedEvent();
  const { canMutateEvent } = useHaasAccess();
  const effectiveHackathonId = useEffectiveHackathonId();

  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [activeId, setActiveId] = useState(
    hackathonIdProp || effectiveHackathonId || "",
  );

  const [rows, setRows] = useState<Row[]>([]);
  const { search, setSearch, debouncedSearch, focusId, clearDeepSearch } =
    useSectionSearch();
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
  const [shownCount, setShownCount] = useState(0);
  const onPaginationInfo = useCallback((info: { shown: number }) => {
    setShownCount(info.shown);
  }, []);
  const [addMemberTarget, setAddMemberTarget] = useState<{
    teamId: string;
    teamName: string;
    hackathonId: string;
    memberUserIds: string[];
  } | null>(null);

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
    if (!activeId) {
      setRows([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setInfo(null);

    try {
      let allTeams: EventTeam[] = await listAllTeams({
        ...apiFilters,
        hackathon: activeId,
      });

      const eventCatalog = await listTeams(activeId, {
        search: debouncedSearch || undefined,
        limit: "100",
      });
      for (const team of eventCatalog) {
        if (!allTeams.some((t) => t.id === team.id)) {
          allTeams.push(team);
        }
      }

      const playing = await listPlayingTeams(activeId, {
        search: debouncedSearch || undefined,
        limit: "100",
      });
      const addedIds = new Set(playing.map((t) => t.id));

      setCatalogLimited(false);

      const merged = new Map<string, Row>();
      for (const team of allTeams) {
        merged.set(team.id, {
          ...team,
          isAdded: addedIds.has(team.id),
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
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load teams");
    } finally {
      setIsLoading(false);
    }
  }, [activeId, apiFilters, debouncedSearch, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const base = rows.filter((row) => {
      if (membership === "added" && !row.isAdded) return false;
      if (membership === "not_added" && row.isAdded) return false;
      if (sideFilter && row.register_as !== sideFilter) return false;
      if (activeFilter === "active" && row.is_active === false) return false;
      if (activeFilter === "inactive" && row.is_active !== false) return false;
      return true;
    });

    return applySectionSearch(
      base,
      debouncedSearch,
      focusId,
      teamRowSearchParts,
    );
  }, [
    rows,
    membership,
    sideFilter,
    activeFilter,
    debouncedSearch,
    focusId,
  ]);

  function clearFilters() {
    clearDeepSearch();
    setMembership("all");
    setSideFilter("");
    setActiveFilter("all");
  }

  function onHackathonChange(nextId: string) {
    setActiveId(nextId);
    if (nextId) {
      setSelectedHackathonId(nextId);
      if (syncUrl) router.push(`/events/${nextId}/teams`);
    }
  }

  function scopeHackathonId() {
    return activeId || null;
  }

  function teamHackathonId(_row: Row): string | null {
    return activeId || null;
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
    if (!activeId) return;
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

  async function onAssignPool(row: Row) {
    const eventId = teamHackathonId(row);
    if (!eventId) return;
    if (!canMutateEvent(eventId)) return;
    if (row.is_blocked) {
      setError("Unblock the team before assigning an IP pool.");
      return;
    }
    const ok = await confirm({
      title: "Assign IP pool",
      message: `Assign an IP pool to "${row.name}"? The team will be deactivated and reactivated so Kubernetes can provision a namespace and pool.`,
      confirmLabel: "Assign pool",
    });
    if (!ok) {
      return;
    }
    setBusyId(row.id);
    setError(null);
    setInfo(null);
    try {
      await provisionTeamIpPool(eventId ?? scopeHackathonId(), row.id);
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

  async function onBlock(row: Row) {
    if (!activeId) return;
    const reason = await prompt({
      title: "Block team",
      message: `Provide a reason for blocking "${row.name}".`,
      label: "Block reason",
      defaultValue: "Blocked in HAS admin",
      confirmLabel: "Block",
    });
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
    if (!activeId) return;
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
    if (!activeId) return;
    const ok = await confirm({
      title: "Remove from event",
      message: `Remove team "${row.name}" from this hackathon? You can Add it again anytime.`,
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) {
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

  function onRowDoubleClick(row: Row) {
    if (!activeId || row.isAdded || busyId) return;
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

  function bulkAdd() {
    if (!activeId) return;
    const ids = selectedRows.filter((r) => !r.isAdded).map((r) => r.id);
    if (ids.length === 0) {
      setError("No selected teams are available to add.");
      return;
    }
    void runBulk("Add", ids, (id) =>
      attachTeam(activeId, id).then(() => undefined),
    );
  }

  async function bulkRemoveFromEvent() {
    if (!activeId) return;
    const ids = selectedRows.filter((r) => r.isAdded).map((r) => r.id);
    if (ids.length === 0) {
      setError("No selected teams are attached to remove.");
      return;
    }
    const ok = await confirm({
      title: "Remove from event",
      message: `Remove ${ids.length} team(s) from this hackathon? You can Add them again later.`,
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) {
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
    Boolean(focusId) ||
    membership !== "all" ||
    Boolean(sideFilter) ||
    activeFilter !== "all";

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Event workspace"
        title="Teams"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => void load()}>
              Refresh
            </Button>
            <Button size="sm" onClick={openCreate} disabled={!activeId}>
              Create team
            </Button>
          </>
        }
      />

      <StickyToolbar
        footer={
          <ListPageStats>
            <ListPageStat label="Total" value={rows.length} />
            <ListPageStatsDot />
            <ListPageStat label="Shown" value={shownCount} />
            <ListPageStatsDot />
            <ListPageStat label="Added" value={addedCount} tone="accent" />
            <ListPageStatsDot />
            <ListPageStat
              label="Not added"
              value={notAddedCount}
              tone="warning"
            />
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
        <FilterSelect
          label="Hackathon"
          value={activeId}
          onChange={onHackathonChange}
          className="min-w-[180px]"
        >
          {hackathons.length === 0 ? (
            <option value="">No events</option>
          ) : (
            hackathons.map((h) => (
              <option key={h.id} value={h.id}>
                {h.display_name || h.name}
              </option>
            ))
          )}
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

        <FilterSelect
          label="Membership"
          value={membership}
          onChange={(v) => setMembership(v as MembershipFilter)}
        >
          <option value="all">All</option>
          <option value="added">Added</option>
          <option value="not_added">Not added</option>
        </FilterSelect>

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

      <TeamFormModal
        open={modalOpen}
        mode={modalMode}
        hackathonId={scopeHackathonId()}
        teamId={editingId}
        canManageMembers={Boolean(activeId && canMutateEvent(activeId))}
        onClose={() => {
          setModalOpen(false);
          setEditingId(null);
        }}
        onSaved={() => void load()}
      />

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
            id: "add",
            label: "Add to event",
            onClick: bulkAdd,
          },
          {
            id: "remove",
            label: "Remove from event",
            onClick: bulkRemoveFromEvent,
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
        onRowDoubleClick={onRowDoubleClick}
        onPaginationInfo={onPaginationInfo}
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
                className={`flex items-center gap-3 ${!row.isAdded ? "cursor-pointer" : ""}`}
              >
                <Avatar
                  src={row.team_picture_url}
                  name={row.name}
                  size="sm"
                  rounded="md"
                />
                <div>
                  <div className="font-medium">{row.name}</div>
                  <div className="font-mono text-[10px] text-[var(--text-muted)]">
                    {row.team_code || row.id}
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "ip_pool",
            header: "IP pool",
            render: (row) => {
              const pool =
                row.ip_pool || row.pool_ip || row.subnet || null;
              const eventId = teamHackathonId(row);
              const canAssign =
                !pool &&
                !row.is_blocked &&
                Boolean(eventId && canMutateEvent(eventId));
              if (pool) {
                return <span className="font-mono text-xs">{pool}</span>;
              }
              if (canAssign) {
                return (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyId === row.id}
                    onClick={() => void onAssignPool(row)}
                  >
                    {busyId === row.id ? "Assigning…" : "Assign pool"}
                  </Button>
                );
              }
              return <span className="text-[var(--text-muted)]">—</span>;
            },
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
              const eventId = activeId || null;
              const memberUserIds = members
                .map((m) => memberUserId(m))
                .filter((id): id is string => Boolean(id));
              return (
                <TeamMembersCell
                  members={members}
                  memberCount={count}
                  hackathonId={eventId || null}
                  canAdd={Boolean(eventId && canMutateEvent(eventId))}
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
                />
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
          {
            key: "actions",
            header: "",
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
                    id: "toggle-active",
                    label: row.is_active === true ? "Deactivate" : "Activate",
                    disabled: busyId === row.id,
                    onClick: () => void onToggleActive(row),
                  },
                  ...(row.isAdded
                    ? [
                        row.is_blocked
                          ? {
                              id: "unblock",
                              label: "Unblock",
                              disabled: busyId === row.id,
                              onClick: () => void onUnblock(row),
                            }
                          : {
                              id: "block",
                              label: "Block",
                              disabled: busyId === row.id,
                              onClick: () => void onBlock(row),
                            },
                        {
                          id: "remove",
                          label: busyId === row.id ? "Removing…" : "Remove",
                          disabled: busyId === row.id,
                          onClick: () => void onRemoveFromHackathon(row),
                        },
                      ]
                    : [
                        {
                          id: "add",
                          label: busyId === row.id ? "Adding…" : "Add",
                          disabled: busyId === row.id,
                          onClick: () => void onAdd(row.id),
                        },
                      ]),
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
