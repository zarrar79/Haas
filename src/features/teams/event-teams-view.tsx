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
import { FormCheckbox, FormSelect, FormTextarea } from "@/components/ui/form-fields";
import { FormSkeleton } from "@/components/ui/skeleton";
import { FilterSelect, FilterTextField, StickyToolbar } from "@/components/ui/sticky-toolbar";
import { TextField } from "@/components/ui/text-field";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { useEffectiveHackathonId } from "@/features/events/use-effective-hackathon-id";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import { useSectionSearch, applySectionSearch, teamRowSearchParts } from "@/features/search/section-search";
import {
  listReferers,
  type RefererItem,
} from "@/features/catalog/catalog-api";
import { listHackathons } from "@/features/hackathons/hackathon-api";
import {
  applyTeamNetworkPolicyEnsuringPool,
  attachTeam,
  blockTeam,
  createTeam,
  deleteTeamNetworkPolicy,
  detachTeamFromHackathon,
  getTeam,
  listPlatformTeams,
  listPlayingTeams,
  provisionTeamIpPool,
  removeTeamMember,
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
import { TeamNetworkPolicyCell } from "@/features/teams/team-network-policy-cell";
import { eventUserDetailPath } from "@/features/users/users-api";
import { redirectIfUnauthorized } from "@/lib/client-api";
import { hackathonLabel } from "@/lib/display-name";
import type { Hackathon } from "@/types/hackathon";

type MembershipFilter = "all" | "added" | "not_added";
type SideFilter = "" | "red" | "blue" | "mix";
type ActiveFilter = "all" | "active" | "inactive";

type Row = EventTeam & {
  isAdded: boolean;
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

export function TeamMembersCell({
  members,
  memberCount,
  hackathonId,
  teamId,
  teamName,
  canAdd,
  canRemove,
  onAdd,
  onRemoved,
}: {
  members: TeamMember[];
  memberCount: number;
  hackathonId: string | null;
  teamId?: string | null;
  teamName?: string;
  canAdd: boolean;
  canRemove?: boolean;
  onAdd?: () => void;
  onRemoved?: () => void;
}) {
  const { confirm } = usePlatformDialog();
  const [busyId, setBusyId] = useState<string | null>(null);
  const showAdd = canAdd && hackathonId && memberCount < MAX_TEAM_MEMBERS;
  const showRemove = Boolean(canRemove && hackathonId && teamId);
  const visible = members.slice(0, 5);
  const extra = memberCount > visible.length ? memberCount - visible.length : 0;

  async function onRemoveMember(member: TeamMember) {
    if (!hackathonId || !teamId || busyId) return;
    const label = memberLabel(member);
    const ok = await confirm({
      title: "Remove member",
      message: `Remove ${label} from ${teamName || "this team"}? Their membership will be deactivated.`,
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    setBusyId(member.id);
    try {
      await removeTeamMember(hackathonId, teamId, member.id);
      onRemoved?.();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex max-w-[220px] items-center gap-1.5">
      {memberCount > 0 ? (
        <div className="flex flex-wrap gap-1">
          {visible.map((member) => {
            const userId = memberUserId(member);
            const label = memberLabel(member);
            const isBusy = busyId === member.id;
            const chipClass =
              "inline-flex max-w-[120px] items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold";
            const removeBtn = showRemove ? (
              <button
                type="button"
                title={`Remove ${label}`}
                aria-label={`Remove ${label}`}
                disabled={isBusy || busyId !== null}
                className="ml-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[11px] leading-none text-[var(--text-muted)] hover:bg-[var(--danger)]/15 hover:text-[var(--danger)] disabled:opacity-50"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void onRemoveMember(member);
                }}
              >
                ×
              </button>
            ) : null;

            if (hackathonId && userId) {
              return (
                <span
                  key={member.id}
                  className={`${chipClass} bg-[var(--accent-muted)] text-[var(--accent)]`}
                >
                  <Link
                    href={eventUserDetailPath(hackathonId, userId)}
                    className="truncate hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {label}
                  </Link>
                  {removeBtn}
                </span>
              );
            }
            return (
              <span
                key={member.id}
                className={`${chipClass} bg-[var(--surface-hover)] text-[var(--text-muted)]`}
              >
                <span className="truncate">{label}</span>
                {removeBtn}
              </span>
            );
          })}
          {extra > 0 ? (
            <span className="text-[10px] text-[var(--text-muted)]">+{extra}</span>
          ) : null}
        </div>
      ) : showAdd ? null : (
        <span className="text-[10px] text-[var(--text-muted)]">No members</span>
      )}
      {showAdd && onAdd ? (
        <Button
          size="sm"
          variant="secondary"
          className="h-6 shrink-0 px-2 text-[10px]"
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

export function TeamFormModal({
  open,
  mode,
  hackathonId,
  teamId,
  canManageMembers,
  hackathons,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "create" | "edit";
  hackathonId?: string | null;
  teamId?: string | null;
  canManageMembers?: boolean;
  /** System /teams: pick which events this team is created for (multi). */
  hackathons?: Hackathon[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [website, setWebsite] = useState("");
  const [registerAs, setRegisterAs] = useState("red");
  const [isActive, setIsActive] = useState(true);
  const [createdForIds, setCreatedForIds] = useState<string[]>([]);
  const [pictureUrl, setPictureUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [clearPicture, setClearPicture] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showCreatedFor = !hackathonId && Array.isArray(hackathons);

  function toggleCreatedFor(id: string, checked: boolean) {
    setCreatedForIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  }

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
      setCreatedForIds([]);
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
        const ids = new Set<string>();
        for (const h of team.created_for || []) {
          if (h?.id) ids.add(h.id);
        }
        if (team.created_in) ids.add(team.created_in);
        if (team.created_in_hackathon?.id) ids.add(team.created_in_hackathon.id);
        setCreatedForIds([...ids]);
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
      const createdForPayload = showCreatedFor
        ? { hackathon_ids: createdForIds }
        : {};
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
            ...createdForPayload,
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
            ...createdForPayload,
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
                : "Platform catalog (Root / system.admin). The same team can be created for multiple hackathons."}
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
              {showCreatedFor ? (
                <div className="space-y-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">
                      Created for hackathons
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      Catalog events only — does not add the team to any live
                      playing roster. Use Playing in / Add to hackathon for that.
                    </p>
                  </div>
                  <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                    {(hackathons || []).length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)]">
                        No hackathons available.
                      </p>
                    ) : (
                      (hackathons || []).map((h) => (
                        <FormCheckbox
                          key={h.id}
                          label={hackathonLabel(h)}
                          checked={createdForIds.includes(h.id)}
                          onChange={(checked) => toggleCreatedFor(h.id, checked)}
                        />
                      ))
                    )}
                  </div>
                  {createdForIds.length > 0 ? (
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {createdForIds.length} selected
                    </p>
                  ) : (
                    <p className="text-[11px] text-[var(--text-muted)]">
                      None selected — platform-only until linked to an event.
                    </p>
                  )}
                </div>
              ) : null}
              <FormSelect
                label="Register as"
                value={registerAs}
                onChange={setRegisterAs}
              >
                <option value="red">red</option>
                <option value="blue">blue</option>
                <option value="mix">mix</option>
              </FormSelect>
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
              <FormTextarea
                label="Description"
                controlClassName="min-h-[80px]"
                value={description}
                onChange={setDescription}
              />
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
  const [referers, setReferers] = useState<RefererItem[]>([]);
  const [activeId, setActiveId] = useState(
    hackathonIdProp || effectiveHackathonId || "",
  );

  const [rows, setRows] = useState<Row[]>([]);
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
      referer: refererFilter || undefined,
      limit: "100",
    }),
    [debouncedSearch, sideFilter, activeFilter, refererFilter],
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
      // Full catalog for this event: created-for (playing_hackathon) ∪ live roster (M2M).
      const catalog = await listPlatformTeams({
        ...apiFilters,
        hackathon: activeId,
      });

      const playing = await listPlayingTeams(activeId, {
        search: debouncedSearch || undefined,
        limit: "500",
      });
      const addedIds = new Set(playing.map((t) => t.id));

      // Ensure every playing-roster team appears even if catalog pagination/filters missed it.
      const byId = new Map<string, EventTeam>();
      for (const team of catalog) byId.set(team.id, team);
      for (const team of playing) {
        if (!byId.has(team.id)) byId.set(team.id, team);
      }

      setCatalogLimited(false);

      const merged = Array.from(byId.values()).map((team) => ({
        ...team,
        isAdded: addedIds.has(team.id),
      }));

      setRows(
        merged.sort((a, b) => (a.name || "").localeCompare(b.name || "")),
      );
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
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
    setRefererFilter("");
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

  async function onApplyPolicy(row: Row) {
    setBusyId(row.id);
    setError(null);
    setInfo(null);
    try {
      await applyTeamNetworkPolicyEnsuringPool(scopeHackathonId(), row);
      setInfo(`Network policy applied for "${row.name}".`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply network policy");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function onDeletePolicy(row: Row) {
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
      await deleteTeamNetworkPolicy(scopeHackathonId(), row.id);
      setInfo(`Network policy deleted for "${row.name}".`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete network policy");
    } finally {
      setBusyId(null);
    }
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
      (action === "apply"
        ? applyTeamNetworkPolicyEnsuringPool(scopeHackathonId(), byId.get(id)!)
        : deleteTeamNetworkPolicy(scopeHackathonId(), id)
      ).then(() => undefined),
    );
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
      title: "Remove playing approval",
      message: `Remove playing approval for team "${row.name}" on this hackathon? You can approve it again anytime.`,
      confirmLabel: "Remove approval",
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
      title: "Remove playing approval",
      message: `Remove playing approval for ${ids.length} team(s) on this hackathon? You can approve them again later.`,
      confirmLabel: "Remove approval",
      destructive: true,
    });
    if (!ok) {
      return;
    }
    void runBulk("Remove playing approval", ids, (id) =>
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
    activeFilter !== "all" ||
    Boolean(refererFilter);

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Event workspace"
        title="Teams"
        actions={
          <Button size="sm" onClick={openCreate} disabled={!activeId}>
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
            <ListPageStatsDot />
            <ListPageStat label="Approved" value={addedCount} tone="accent" />
            <ListPageStatsDot />
            <ListPageStat
              label="Not approved"
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
                {hackathonLabel(h)}
              </option>
            ))
          )}
        </FilterSelect>

        <FilterTextField
          label="Search"
          name="search"
          value={search}
          onChange={setSearch}
          placeholder="Name, code…"
        />

        <FilterSelect
          label="Approved For Playing"
          value={membership}
          onChange={(v) => setMembership(v as MembershipFilter)}
        >
          <option value="all">All</option>
          <option value="added">Approved</option>
          <option value="not_added">Not approved</option>
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
            label: "Approve for playing",
            onClick: bulkAdd,
          },
          {
            id: "remove",
            label: "Remove playing approval",
            onClick: bulkRemoveFromEvent,
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
            className: "min-w-[10rem]",
            render: (row) => (
              <div
                className={`flex items-center gap-2 ${!row.isAdded ? "cursor-pointer" : ""}`}
              >
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
            key: "ip_pool",
            header: "IP",
            className: "max-w-[7.5rem]",
            render: (row) => {
              const pool = row.ip_pool || row.pool_ip || row.subnet || null;
              const eventId = teamHackathonId(row);
              const canAssign =
                !pool &&
                !row.is_blocked &&
                Boolean(eventId && canMutateEvent(eventId));
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
              if (canAssign) {
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
                canManage={Boolean(activeId && canMutateEvent(activeId))}
                onApply={() => void onApplyPolicy(row)}
                onDelete={() => void onDeletePolicy(row)}
              />
            ),
          },
          {
            key: "members",
            header: "Members",
            wrap: true,
            className: "min-w-[9rem] max-w-[14rem]",
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
            key: "referer",
            header: "Referer",
            render: (row) =>
              row.referer_detail?.name || row.referer_detail?.slug || (
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
            header: "Playing",
            render: (row: Row) =>
              row.isAdded ? (
                <Badge tone="success">Approved</Badge>
              ) : (
                <Badge tone="warning">Not approved</Badge>
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
                          label:
                            busyId === row.id
                              ? "Removing…"
                              : "Remove playing approval",
                          disabled: busyId === row.id,
                          onClick: () => void onRemoveFromHackathon(row),
                        },
                      ]
                    : [
                        {
                          id: "add",
                          label:
                            busyId === row.id ? "Approving…" : "Approve for playing",
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
