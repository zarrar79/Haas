"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ListPageStat,
  ListPageStats,
  ListPageStatsDot,
} from "@/components/ui/list-page-stats";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/loader";
import { EventModeSchedulePanel } from "@/features/events/event-mode-schedule-panel";
import {
  EventModeSubnav,
  ctfSubnavItems,
} from "@/features/events/event-mode-subnav";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import {
  getPlaying,
  type PlayingState,
} from "@/features/settings/settings-api";
import { onPlayingScheduleChanged } from "@/features/settings/playing-schedule-sync";
import { redirectIfUnauthorized } from "@/lib/client-api";
import { formatDate } from "@/lib/format";

type Props = { hackathonId: string };

function phaseTone(phase?: string) {
  switch (phase) {
    case "open":
      return "success" as const;
    case "countdown":
      return "warning" as const;
    case "paused":
      return "warning" as const;
    case "ended":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

export function EventCtfView({ hackathonId }: Props) {
  const router = useRouter();
  const { setSelectedHackathonId } = useSelectedEvent();
  const [activeId, setActiveId] = useState(hackathonId);
  const [playing, setPlaying] = useState<PlayingState>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveId(hackathonId);
    if (hackathonId) setSelectedHackathonId(hackathonId);
  }, [hackathonId, setSelectedHackathonId]);

  const load = useCallback(async () => {
    if (!activeId) return;
    setIsLoading(true);
    setError(null);
    try {
      setPlaying((await getPlaying(activeId)) || {});
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Failed to load CTF");
    } finally {
      setIsLoading(false);
    }
  }, [activeId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return onPlayingScheduleChanged((id) => {
      if (id === activeId) void load();
    });
  }, [activeId, load]);

  const ctf = playing.modes?.ctf;
  const event = playing.event;

  return (
    <div className="w-full space-y-4">
      <PageHeader
        eyebrow="CTF"
        title="Play window"
        description="Jeopardy / challenge track for this event. CTF time is independent of the Hackathon Event envelope."
        actions={
          <Link href={`/events/${activeId}/hackathon`}>
            <Button variant="secondary" size="sm">
              Hackathon
            </Button>
          </Link>
        }
      />

      <EventModeSubnav items={ctfSubnavItems(activeId)} />

      {error ? <Alert variant="error">{error}</Alert> : null}

      {isLoading ? (
        <PageLoader label="Loading CTF…" variant="form" />
      ) : (
        <>
          <ListPageStats>
            <ListPageStat
              label="CTF phase"
              value={
                <Badge tone={phaseTone(ctf?.phase)}>
                  {ctf?.phase || "not_set"}
                  {ctf?.isOpen ? " · open" : ""}
                </Badge>
              }
            />
            <ListPageStatsDot />
            <ListPageStat
              label="CTF start"
              value={ctf?.start ? formatDate(ctf.start) : "—"}
            />
            <ListPageStatsDot />
            <ListPageStat
              label="CTF end"
              value={
                ctf?.isInfinite
                  ? "Infinite"
                  : ctf?.end
                    ? formatDate(ctf.end)
                    : "—"
              }
            />
            <ListPageStatsDot />
            <ListPageStat
              label="Challenges on CTF"
              value={String(playing.challenge_count ?? 0)}
            />
            <ListPageStatsDot />
            <ListPageStat
              label="Event window"
              value={
                event?.isInfinite
                  ? "Infinite"
                  : event?.start
                    ? `${formatDate(event.start)} → ${event.end ? formatDate(event.end) : "—"}`
                    : "—"
              }
            />
          </ListPageStats>

          <EventModeSchedulePanel
            hackathonId={activeId}
            showEvent={false}
            visibleModes={["ctf"]}
            title="CTF schedule"
            description="Set the CTF play clock here. Event start/end do not gate CTF — edit the Event envelope under Hackathon if needed."
            onSaved={(next) => setPlaying(next)}
          />
        </>
      )}
    </div>
  );
}
