"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { HackathonQuickActions } from "@/features/hackathons/hackathon-quick-actions";
import { HackathonUserAssignmentSection } from "@/features/hackathons/hackathon-user-assignment-section";
import { OrganizationPicker } from "@/features/organizations/organization-picker";
import { SponsorPicker } from "@/features/sponsors/sponsor-picker";
import type { SystemUser } from "@/features/system/system-api";
import { ApiRequestError } from "@/lib/client-api";
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
  const [isActive, setIsActive] = useState(true);
  const [viewOnDashboard, setViewOnDashboard] = useState(false);
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
    setIsActive(coerceBool(data.is_active));
    setViewOnDashboard(coerceBool(data.view_on_dashboard));
    setSponsorIds((data.sponsors || []).map((s) => s.id));
    setOrganizationId(data.city || data.organization?.id || null);
  }

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const [data, bindings, analytics] = await Promise.all([
        getHackathon(hackathonId),
        isRoot || isPlatformOperator
          ? listHackathonAdmins({
              hackathon: hackathonId,
              show_inactive: "true",
            })
          : Promise.resolve([] as HackathonAdminBinding[]),
        getHackathonAnalytics(hackathonId).catch(() => null),
      ]);
      setHackathon(data);
      applyLoadedHackathon(data);
      setTeamCount(analytics?.teams ?? null);
      setChallengeCount(analytics?.challenges ?? null);
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
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load hackathon");
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId, router, isRoot, isPlatformOperator]);

  useEffect(() => {
    void load();
  }, [load]);

  function onInfiniteChange(checked: boolean) {
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
        is_infinite: isInfinite,
        is_active: isActive,
        view_on_dashboard: viewOnDashboard,
        city: organizationId,
        sponsor_ids: sponsorIds,
        ...(isInfinite
          ? {}
          : {
              start_datetime: toIsoLocal(startDatetime),
              end_datetime: toIsoLocal(endDatetime),
            }),
      });
      setHackathon(updated);
      applyLoadedHackathon(updated);

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
          <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text)]">Description</span>
            <textarea
              className="min-h-24 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] disabled:opacity-60"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canWrite || isSaving}
            />
          </label>

          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text)]">
              Schedule
            </h3>
            <label className="mb-3 flex items-start gap-2 text-sm text-[var(--text)]">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0"
                checked={isInfinite}
                onChange={(e) => onInfiniteChange(e.target.checked)}
                disabled={!canWrite || isSaving}
              />
              <span>
                <span className="font-medium">Infinite event</span>
                <span className="mt-0.5 block text-[var(--text-muted)]">
                  No fixed end window.
                </span>
              </span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Start"
                name="start"
                type="datetime-local"
                required={!isInfinite}
                disabled={!canWrite || isSaving || isInfinite}
                value={startDatetime}
                onChange={(e) => setStartDatetime(e.target.value)}
              />
              <TextField
                label="End"
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

          <div className="flex flex-wrap gap-4 text-sm text-[var(--text)]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={!canWrite || isSaving}
              />
              Active
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={viewOnDashboard}
                onChange={(e) => setViewOnDashboard(e.target.checked)}
                disabled={!canWrite || isSaving}
              />
              View on dashboard
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
    </div>
  );
}
