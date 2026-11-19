"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormTextarea } from "@/components/ui/form-fields";
import { FormSkeleton } from "@/components/ui/skeleton";
import { TextField } from "@/components/ui/text-field";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import {
  listHackathonAdmins,
  syncHackathonAdmins,
  type HackathonAdminBinding,
} from "@/features/hackathon-admins/hackathon-admin-api";
import {
  getHackathon,
  getHackathonAnalytics,
  updateHackathon,
} from "@/features/hackathons/hackathon-api";
import {
  getPlaying,
  patchPlaying,
} from "@/features/settings/settings-api";
import { notifyPlayingScheduleChanged } from "@/features/settings/playing-schedule-sync";
import { EventLiveDashboardSettingsPanel } from "@/features/events/event-live-dashboard-settings-panel";
import { EventModeSchedulePanel } from "@/features/events/event-mode-schedule-panel";
import { HackathonQuickActions } from "@/features/hackathons/hackathon-quick-actions";
import { HackathonUserAssignmentSection } from "@/features/hackathons/hackathon-user-assignment-section";
import { OrganizationPicker } from "@/features/organizations/organization-picker";
import { SponsorPicker } from "@/features/sponsors/sponsor-picker";
import type { SystemUser } from "@/features/system/system-api";
import { redirectIfUnauthorized } from "@/lib/client-api";
import type { Hackathon } from "@/types/hackathon";

function toDatetimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoLocal(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

function coerceBool(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true" ||
    value === "True"
  );
}

type Props = {
  hackathonId: string;
  onSaved?: (hackathon: Hackathon) => void;
};

export function EventHackathonDetailsPanel({ hackathonId, onSaved }: Props) {
  const router = useRouter();
  const { isRoot, isPlatformOperator, canMutateEvent } = useHaasAccess();
  const canWrite = canMutateEvent(hackathonId);

  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [teamCount, setTeamCount] = useState<number | null>(null);
  const [challengeCount, setChallengeCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [startDatetime, setStartDatetime] = useState("");
  const [endDatetime, setEndDatetime] = useState("");
  const [discordLink, setDiscordLink] = useState("");
  const [isInfinite, setIsInfinite] = useState(false);
  const [isPlatformLive, setIsPlatformLive] = useState(false);
  const [isActive, setIsActive] = useState(true);
  /** PlayingHackathon.is_open — allow create/join teams. */
  const [allowTeamRegistration, setAllowTeamRegistration] = useState(true);
  /** PlayingHackathon.show_to_clients — list in player Events catalog. */
  const [showToClients, setShowToClients] = useState(true);
  const [adminBindings, setAdminBindings] = useState<HackathonAdminBinding[]>(
    [],
  );
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [assigneeUsers, setAssigneeUsers] = useState<SystemUser[]>([]);
  const [sponsorIds, setSponsorIds] = useState<string[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  function applyLoadedHackathon(data: Hackathon) {
    setName(data.name || "");
    setDisplayName(data.display_name || data.name || "");
    setDescription(data.description || "");
    setStartDatetime(toDatetimeLocal(data.start_datetime));
    setEndDatetime(toDatetimeLocal(data.end_datetime));
    setDiscordLink(data.discord_link || "");
    setIsInfinite(coerceBool(data.is_infinite));
    setIsPlatformLive(coerceBool(data.is_platform_live));
    setIsActive(coerceBool(data.is_active));
    setSponsorIds((data.sponsors || []).map((s) => s.id));
    setOrganizationId(data.city || data.organization?.id || null);
  }

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const [data, bindings, analytics, playing] = await Promise.all([
        getHackathon(hackathonId),
        isRoot || isPlatformOperator
          ? listHackathonAdmins({
              hackathon: hackathonId,
              show_inactive: "true",
            })
          : Promise.resolve([] as HackathonAdminBinding[]),
        getHackathonAnalytics(hackathonId).catch(() => null),
        getPlaying(hackathonId).catch(() => null),
      ]);
      setHackathon(data);
      applyLoadedHackathon(data);
      // Prefer live playing-roster counts over catalog/created-for analytics.
      setTeamCount(
        playing?.team_count ?? analytics?.teams ?? null,
      );
      setChallengeCount(
        playing?.challenge_count ?? analytics?.challenges ?? null,
      );
      setAllowTeamRegistration(
        playing ? coerceBool(playing.is_open) : true,
      );
      setShowToClients(
        playing ? playing.show_to_clients !== false : true,
      );
      setAdminBindings(bindings);
      const activeBindings = bindings.filter((b) => b.is_active !== false);
      setAssigneeIds(activeBindings.map((b) => b.user));
      setAssigneeUsers(
        activeBindings
          .map((b) =>
            b.user_detail?.id
              ? ({ ...b.user_detail, id: b.user_detail.id } as SystemUser)
              : null,
          )
          .filter(Boolean) as SystemUser[],
      );
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Failed to load hackathon");
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId, router, isRoot, isPlatformOperator]);

  useEffect(() => {
    void load();
  }, [load]);

  function onInfiniteChange(checked: boolean) {
    if (isPlatformLive) return;
    setIsInfinite(checked);
    if (!checked && hackathon && coerceBool(hackathon.is_infinite)) {
      setStartDatetime("");
      setEndDatetime("");
    }
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!canWrite) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    if (!isInfinite) {
      if (!startDatetime || !endDatetime) {
        setError("Start and end are required when the event is timed.");
        setIsSaving(false);
        return;
      }
      if (new Date(endDatetime).getTime() < new Date(startDatetime).getTime()) {
        setError("End datetime cannot be before start datetime.");
        setIsSaving(false);
        return;
      }
    }

    if ((isRoot || isPlatformOperator) && assigneeIds.length === 0) {
      setError("Add at least one event administrator.");
      setIsSaving(false);
      return;
    }

    try {
      const updated = await updateHackathon(hackathonId, {
        name: name.trim() || undefined,
        display_name: displayName.trim() || name.trim() || undefined,
        description,
        discord_link: discordLink,
        // Platform Live is provisioned once via ensure_platform_live — not toggled here.
        is_infinite: isInfinite || isPlatformLive,
        is_active: isActive,
        city: organizationId,
        sponsor_ids: sponsorIds,
        ...(isInfinite || isPlatformLive
          ? {}
          : {
              start_datetime: toIsoLocal(startDatetime),
              end_datetime: toIsoLocal(endDatetime),
            }),
      });
      setHackathon(updated);
      applyLoadedHackathon(updated);

      const playingUpdated = await patchPlaying(hackathonId, {
        is_open: allowTeamRegistration,
        show_to_clients: showToClients,
        is_active: isActive,
      });
      setAllowTeamRegistration(coerceBool(playingUpdated.is_open));
      setShowToClients(playingUpdated.show_to_clients !== false);

      if (isRoot || isPlatformOperator) {
        await syncHackathonAdmins(hackathonId, assigneeIds, adminBindings);
        const bindings = await listHackathonAdmins({
          hackathon: hackathonId,
          show_inactive: "true",
        });
        setAdminBindings(bindings);
        const activeBindings = bindings.filter((b) => b.is_active !== false);
        setAssigneeIds(activeBindings.map((b) => b.user));
        setAssigneeUsers(
          activeBindings
            .map((b) =>
              b.user_detail?.id
                ? ({ ...b.user_detail, id: b.user_detail.id } as SystemUser)
                : null,
            )
            .filter(Boolean) as SystemUser[],
        );
      }

      setSuccess("Hackathon details saved.");
      notifyPlayingScheduleChanged(hackathonId);
      onSaved?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <FormSkeleton fields={8} />;
  }

  if (!hackathon) {
    return <Alert variant="error">{error || "Hackathon not found."}</Alert>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {hackathon.is_deleted ? (
            <Badge tone="danger">Archived</Badge>
          ) : hackathon.is_active ? (
            <Badge tone="success">Active</Badge>
          ) : (
            <Badge>Inactive</Badge>
          )}
          {coerceBool(hackathon.is_infinite) ? (
            <Badge tone="success">Infinite</Badge>
          ) : null}
          {hackathon.my_roles?.map((role) => (
            <Badge key={role}>{role}</Badge>
          ))}
        </div>
        <HackathonQuickActions
          hackathonId={hackathonId}
          teamCount={teamCount}
          challengeCount={challengeCount}
        />
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <form
        onSubmit={handleSave}
        className="grid gap-5 lg:grid-cols-2"
      >
        <div className="flex flex-col gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Event details
          </h2>
          <TextField
            label="Name"
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canWrite || isSaving}
          />
          <TextField
            label="Display name"
            name="display_name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={!canWrite || isSaving}
          />
          <FormTextarea
            label="Description"
            controlClassName="min-h-24"
            value={description}
            onChange={setDescription}
            disabled={!canWrite || isSaving}
          />

          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] p-4">
            <h3 className="mb-1 text-sm font-semibold text-[var(--text)]">
              Event schedule
            </h3>
            <p className="mb-3 text-xs text-[var(--text-muted)]">
              Hackathon = Event envelope only. CTF and KOTH clocks are set in
              the mode schedules panel below (and under the CTF / KOTH nav
              tabs).
            </p>
            <label className="mb-3 flex items-start gap-2 text-sm text-[var(--text)]">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0"
                checked={isInfinite || isPlatformLive}
                onChange={(e) => onInfiniteChange(e.target.checked)}
                disabled={!canWrite || isSaving || isPlatformLive}
              />
              <span>
                <span className="font-medium">Infinite event</span>
                <span className="mt-0.5 block text-[var(--text-muted)]">
                  No fixed Event end window (does not make CTF infinite).
                </span>
              </span>
            </label>
            {isPlatformLive ? (
              <div className="mb-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-muted)]">
                <span className="font-medium text-[var(--text)]">
                  Platform Live event
                </span>
                <span className="mt-0.5 block">
                  Provisioned once for solo enrollment — not editable here. Only
                  one Live event exists at a time.
                </span>
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Event start"
                name="start"
                type="datetime-local"
                required={!isInfinite}
                disabled={!canWrite || isSaving || isInfinite}
                value={startDatetime}
                onChange={(e) => setStartDatetime(e.target.value)}
              />
              <TextField
                label="Event end"
                name="end"
                type="datetime-local"
                required={!isInfinite}
                disabled={!canWrite || isSaving || isInfinite}
                value={endDatetime}
                onChange={(e) => setEndDatetime(e.target.value)}
              />
            </div>
          </div>

          <TextField
            label="Discord link"
            name="discord"
            value={discordLink}
            onChange={(e) => setDiscordLink(e.target.value)}
            disabled={!canWrite || isSaving}
          />

          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text)]">
              Player access
            </h3>
            <label className="flex items-start gap-2 text-sm text-[var(--text)]">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0"
                checked={allowTeamRegistration}
                onChange={(e) => setAllowTeamRegistration(e.target.checked)}
                disabled={!canWrite || isSaving}
              />
              <span>
                <span className="font-medium">Allow team create / join</span>
                <span className="mt-0.5 block text-[var(--text-muted)]">
                  Players can create or join teams while this is on. Defaults to
                  open before the event starts and auto-unchecks when the event
                  starts.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-[var(--text)]">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0"
                checked={showToClients}
                onChange={(e) => setShowToClients(e.target.checked)}
                disabled={!canWrite || isSaving}
              />
              <span>
                <span className="font-medium">Show event to clients</span>
                <span className="mt-0.5 block text-[var(--text-muted)]">
                  List this event in the player Events catalog. Turn off to hide
                  it from clients without deleting the event.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-[var(--text)]">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={!canWrite || isSaving}
              />
              <span>
                <span className="font-medium">Active</span>
                <span className="mt-0.5 block text-[var(--text-muted)]">
                  Event and playing instance are active.
                </span>
              </span>
            </label>
          </div>

          {canWrite ? (
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save details"}
            </Button>
          ) : (
            <Alert variant="info">
              You have read-only access to this hackathon.
            </Alert>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Primary organization
            </h2>
            <OrganizationPicker
              hackathonId={hackathonId}
              selectedId={organizationId}
              onChange={(id) => setOrganizationId(id)}
              disabled={!canWrite || isSaving}
            />
          </div>

          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Attached sponsors
            </h2>
            <SponsorPicker
              hackathonId={hackathonId}
              selectedIds={sponsorIds}
              onChange={(ids) => setSponsorIds(ids)}
              disabled={!canWrite || isSaving}
            />
          </div>

          {isRoot || isPlatformOperator ? (
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
              <HackathonUserAssignmentSection
                selectedIds={assigneeIds}
                selectedUsers={assigneeUsers}
                onChange={(ids, users) => {
                  setAssigneeIds(ids);
                  setAssigneeUsers(users);
                }}
                disabled={!canWrite || isSaving}
              />
            </div>
          ) : null}
        </div>
      </form>

      <EventModeSchedulePanel
        hackathonId={hackathonId}
        showEvent
        visibleModes={["ctf", "koth"]}
        title="Event & mode schedules"
        description="Set Event, CTF, and KOTH times here. Mode play never uses Event start/end. A&D is skipped for now."
        className="mt-5"
      />

      <div className="mt-5">
        <EventLiveDashboardSettingsPanel
          hackathonId={hackathonId}
          disabled={isSaving}
        />
      </div>
    </div>
  );
}
