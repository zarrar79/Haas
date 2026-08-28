"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { TextField } from "@/components/ui/text-field";
import { createHackathon } from "@/features/hackathons/hackathon-api";
import { ApiRequestError } from "@/lib/client-api";

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
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
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
        city: null,
        is_infinite: isInfinite,
        is_active: isActive,
        view_on_dashboard: viewOnDashboard,
        discord_link: discordLink,
        ...(isInfinite
          ? {}
          : {
              start_datetime: toIsoLocal(startDatetime),
              end_datetime: toIsoLocal(endDatetime),
            }),
      });
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
    <div className="w-full">
      <PageHeader
        eyebrow="Events"
        title="Create hackathon"
        description="POST /api/haas/hackathons/ — Root / system.admin only."
        actions={
          <Link href="/hackathons">
            <Button variant="secondary">Back to list</Button>
          </Link>
        }
      />

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5"
      >
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
      </form>
    </div>
  );
}
