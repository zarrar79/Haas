"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { TextField } from "@/components/ui/text-field";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import {
  archiveHackathon,
  breakGlassHackathon,
  getHackathon,
  restoreHackathon,
  updateHackathon,
} from "@/features/hackathons/hackathon-api";
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
  return value === true || value === 1 || value === "1" || value === "true" || value === "True";
}

type HackathonDetailViewProps = {
  hackathonId: string;
};

export function HackathonDetailView({ hackathonId }: HackathonDetailViewProps) {
  const router = useRouter();
  const { setSelectedHackathonId } = useSelectedEvent();
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [startDatetime, setStartDatetime] = useState("");
  const [endDatetime, setEndDatetime] = useState("");
  const [discordLink, setDiscordLink] = useState("");
  const [isInfinite, setIsInfinite] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [viewOnDashboard, setViewOnDashboard] = useState(false);
  const [breakGlassReason, setBreakGlassReason] = useState("");

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
  }

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getHackathon(hackathonId);
      setHackathon(data);
      applyLoadedHackathon(data);
    } catch (err) {
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load hackathon");
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  function onInfiniteChange(checked: boolean) {
    setIsInfinite(checked);
    if (!checked && hackathon && coerceBool(hackathon.is_infinite)) {
      // Reverting from infinite — clear the far-future window so the user sets real times.
      setStartDatetime("");
      setEndDatetime("");
    }
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
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

    try {
      const updated = await updateHackathon(hackathonId, {
        name: name.trim() || undefined,
        display_name: displayName.trim() || name.trim() || undefined,
        description,
        discord_link: discordLink,
        is_infinite: isInfinite,
        is_active: isActive,
        view_on_dashboard: viewOnDashboard,
        ...(isInfinite
          ? {}
          : {
              start_datetime: toIsoLocal(startDatetime),
              end_datetime: toIsoLocal(endDatetime),
            }),
      });
      setHackathon(updated);
      applyLoadedHackathon(updated);
      setSuccess(
        isInfinite
          ? "Event updated as infinite (no fixed end)."
          : "Event updated with a timed window.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsSaving(false);
    }
  }

  async function runAction(
    action: () => Promise<unknown>,
    okMessage: string,
  ) {
    setActionBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await action();
      setSuccess(okMessage);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionBusy(false);
    }
  }

  if (isLoading) {
    return (
      <p className="text-sm text-[var(--text-muted)]">Loading hackathon…</p>
    );
  }

  if (!hackathon) {
    return <Alert variant="error">{error || "Hackathon not found."}</Alert>;
  }

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Events"
        title={hackathon.display_name || hackathon.name}
        description={`GET/PATCH /api/haas/hackathons/${hackathonId}/`}
        actions={
          <>
            <Link href="/hackathons">
              <Button variant="secondary">Back</Button>
            </Link>
            <Button
              onClick={() => {
                setSelectedHackathonId(hackathonId);
                router.push(`/events/${hackathonId}`);
              }}
            >
              Enter workspace
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
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

      {error ? (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}
      {success ? (
        <div className="mb-4">
          <Alert variant="success">{success}</Alert>
        </div>
      ) : null}

      <form
        onSubmit={handleSave}
        className="mb-6 flex flex-col gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5"
      >
        <h2 className="text-sm font-semibold text-[var(--text)]">Edit event</h2>
        <TextField
          label="Name"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Display name"
          name="display_name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
          <span className="font-medium text-[var(--text)]">Description</span>
          <textarea
            className="min-h-24 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
            />
            <span>
              <span className="font-medium">Infinite event</span>
              <span className="mt-0.5 block text-[var(--text-muted)]">
                No fixed end. Uncheck to set an explicit start and end time.
              </span>
            </span>
          </label>
          {isInfinite ? (
            <p className="mb-3 text-sm text-[var(--text-muted)]">
              Open-ended schedule. Saving keeps the event infinite (server sets
              start=now and a far-future end).
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Start"
              name="start"
              type="datetime-local"
              required={!isInfinite}
              disabled={isInfinite}
              value={startDatetime}
              onChange={(e) => setStartDatetime(e.target.value)}
            />
            <TextField
              label="End"
              name="end"
              type="datetime-local"
              required={!isInfinite}
              disabled={isInfinite}
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
        />
        <div className="flex flex-wrap gap-4 text-sm text-[var(--text)]">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Active
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={viewOnDashboard}
              onChange={(e) => setViewOnDashboard(e.target.checked)}
            />
            View on dashboard
          </label>
        </div>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-3 text-sm font-semibold text-[var(--text)]">
          Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          {hackathon.is_deleted ? (
            <Button
              variant="secondary"
              disabled={actionBusy}
              onClick={() =>
                void runAction(
                  () => restoreHackathon(hackathonId),
                  "Hackathon restored.",
                )
              }
            >
              Restore
            </Button>
          ) : (
            <Button
              variant="danger"
              disabled={actionBusy}
              onClick={() =>
                void runAction(
                  () => archiveHackathon(hackathonId),
                  "Hackathon archived.",
                )
              }
            >
              Archive
            </Button>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <TextField
              label="Break-glass reason"
              name="reason"
              value={breakGlassReason}
              onChange={(e) => setBreakGlassReason(e.target.value)}
              placeholder="Customer outage"
            />
          </div>
          <Button
            variant="secondary"
            disabled={actionBusy || !breakGlassReason.trim()}
            onClick={() =>
              void runAction(
                () => breakGlassHackathon(hackathonId, breakGlassReason.trim()),
                "Break-glass requested.",
              )
            }
          >
            Break glass
          </Button>
        </div>
      </section>

      {hackathon.modules ? (
        <section className="mt-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--text)]">
            Modules
          </h2>
          <ul className="space-y-1 text-sm text-[var(--text-muted)]">
            <li>Jeopardy: {String(hackathon.modules.jeopardy_enabled)}</li>
            <li>KoTH: {String(hackathon.modules.koth_enabled)}</li>
            <li>
              Attack & Defence:{" "}
              {String(hackathon.modules.attack_defence_enabled)}
            </li>
            <li>
              Viewer can export: {String(hackathon.modules.viewer_can_export)}
            </li>
          </ul>
        </section>
      ) : null}
    </div>
  );
}
