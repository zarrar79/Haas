"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { TextField } from "@/components/ui/text-field";
import { assignHackathonAdmin } from "@/features/hackathon-admins/hackathon-admin-api";
import { createHackathon } from "@/features/hackathons/hackathon-api";
import { HackathonUserAssignmentSection } from "@/features/hackathons/hackathon-user-assignment-section";
import { SponsorPicker } from "@/features/sponsors/sponsor-picker";
import { OrganizationPicker } from "@/features/organizations/organization-picker";
import { ApiRequestError } from "@/lib/client-api";
import type { SystemUser } from "@/features/system/system-api";

function toIsoLocal(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

export function HackathonCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [startDatetime, setStartDatetime] = useState("");
  const [endDatetime, setEndDatetime] = useState("");
  const [discordLink, setDiscordLink] = useState("");
  const [isInfinite, setIsInfinite] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [viewOnDashboard, setViewOnDashboard] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [assigneeUsers, setAssigneeUsers] = useState<SystemUser[]>([]);
  const [sponsorIds, setSponsorIds] = useState<string[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (assigneeIds.length === 0) {
      setError("Add at least one user as event admin.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (!isInfinite) {
        if (!startDatetime || !endDatetime) {
          setError("Start and end are required when the event is timed.");
          setIsSubmitting(false);
          return;
        }
        if (
          new Date(endDatetime).getTime() < new Date(startDatetime).getTime()
        ) {
          setError("End datetime cannot be before start datetime.");
          setIsSubmitting(false);
          return;
        }
      }

      const created = await createHackathon({
        name,
        display_name: displayName || name,
        description,
        city: organizationId,
        is_infinite: isInfinite,
        is_active: isActive,
        view_on_dashboard: viewOnDashboard,
        discord_link: discordLink,
        organizer_id: assigneeIds[0],
        ...(sponsorIds.length > 0 ? { sponsor_ids: sponsorIds } : {}),
        ...(isInfinite
          ? {}
          : {
              start_datetime: toIsoLocal(startDatetime),
              end_datetime: toIsoLocal(endDatetime),
            }),
      });

      await Promise.all(
        assigneeIds.map((userId) =>
          assignHackathonAdmin({
            user: userId,
            hackathon: created.id,
            notes: "Assigned on hackathon create",
          }),
        ),
      );

      router.push(`/hackathons/${created.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full space-y-5">
      <PageHeader
        eyebrow="Events"
        title="Create hackathon"
        description="Create a new event and assign administrators."
        actions={
          <Link href="/hackathons">
            <Button variant="secondary" size="sm">
              All events
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-2">
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
          <label className="flex items-start gap-2 text-sm text-[var(--text)]">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={isInfinite}
              onChange={(e) => setIsInfinite(e.target.checked)}
            />
            <span>
              <span className="font-medium">Infinite event</span>
              <span className="mt-0.5 block text-[var(--text-muted)]">
                No fixed end window. Uncheck to set start and end times.
              </span>
            </span>
          </label>
          {isInfinite ? (
            <p className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-muted)]">
              Schedule will be open-ended (server sets a far-future end).
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Start"
                name="start"
                type="datetime-local"
                required
                value={startDatetime}
                onChange={(e) => setStartDatetime(e.target.value)}
              />
              <TextField
                label="End"
                name="end"
                type="datetime-local"
                required
                value={endDatetime}
                onChange={(e) => setEndDatetime(e.target.value)}
              />
            </div>
          )}
          <TextField
            label="Discord link"
            name="discord"
            value={discordLink}
            onChange={(e) => setDiscordLink(e.target.value)}
          />
          <OrganizationPicker
            selectedId={organizationId}
            onChange={(id) => setOrganizationId(id)}
            disabled={isSubmitting}
          />
          <SponsorPicker
            selectedIds={sponsorIds}
            onChange={(ids) => setSponsorIds(ids)}
            disabled={isSubmitting}
          />
          <div className="flex flex-wrap gap-4 text-sm text-[var(--text)]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={viewOnDashboard}
                onChange={(e) => setViewOnDashboard(e.target.checked)}
              />
              View on dashboard
            </label>
          </div>

          {error ? <Alert variant="error">{error}</Alert> : null}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create hackathon"}
          </Button>
        </div>

        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <HackathonUserAssignmentSection
            selectedIds={assigneeIds}
            selectedUsers={assigneeUsers}
            onChange={(ids, users) => {
              setAssigneeIds(ids);
              setAssigneeUsers(users);
            }}
            disabled={isSubmitting}
          />
        </div>
      </form>
    </div>
  );
}
