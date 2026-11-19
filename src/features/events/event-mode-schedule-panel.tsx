"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/loader";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import {
  PlayingModeScheduleBoard,
  type ModeKey,
} from "@/features/settings/playing-mode-schedule-board";
import {
  getPlaying,
  patchPlaying,
  type ModeScheduleBlock,
  type ModeSchedulePatch,
  type PlayingModes,
  type PlayingState,
} from "@/features/settings/settings-api";
import {
  notifyPlayingScheduleChanged,
  onPlayingScheduleChanged,
} from "@/features/settings/playing-schedule-sync";
import { redirectIfUnauthorized } from "@/lib/client-api";

function toIsoFromLocal(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

function modePatchFromBlock(
  block: ModeScheduleBlock | null | undefined,
): ModeSchedulePatch | undefined {
  if (!block) return undefined;
  return {
    enabled: block.enabled,
    isPaused: block.isPaused,
    isInfinite: block.isInfinite,
    start:
      block.start == null
        ? block.start
        : toIsoFromLocal(block.start) ?? block.start,
    end:
      block.end == null ? block.end : toIsoFromLocal(block.end) ?? block.end,
  };
}

type Props = {
  hackathonId: string;
  /** Show Event envelope editors. */
  showEvent?: boolean;
  /** Mode cards to show. Default CTF + KOTH. */
  visibleModes?: ModeKey[];
  title?: string;
  description?: string;
  className?: string;
  onSaved?: (playing: PlayingState) => void;
};

export function EventModeSchedulePanel({
  hackathonId,
  showEvent = true,
  visibleModes = ["ctf", "koth"],
  title = "Event & mode schedules",
  description = "Hackathon is the Event envelope. Set CTF and KOTH clocks separately — they do not inherit Event start/end.",
  className = "",
  onSaved,
}: Props) {
  const router = useRouter();
  const { canMutateEvent } = useHaasAccess();
  const canWrite = canMutateEvent(hackathonId);

  const [playing, setPlaying] = useState<PlayingState>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!hackathonId) return;
      if (!opts?.silent) setIsLoading(true);
      setError(null);
      try {
        setPlaying((await getPlaying(hackathonId)) || {});
      } catch (err) {
        if (redirectIfUnauthorized(err, router)) return;
        setError(err instanceof Error ? err.message : "Failed to load schedules");
      } finally {
        if (!opts?.silent) setIsLoading(false);
      }
    },
    [hackathonId, router],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return onPlayingScheduleChanged((id) => {
      if (id === hackathonId) void load({ silent: true });
    });
  }, [hackathonId, load]);

  function setPlayingMode(
    key: keyof PlayingModes,
    patch: Partial<ModeScheduleBlock>,
  ) {
    setPlaying((prev) => ({
      ...prev,
      modes: {
        ...prev.modes,
        [key]: { ...(prev.modes?.[key] ?? {}), ...patch },
      },
    }));
  }

  function setPlayingModeDatetime(
    key: keyof PlayingModes,
    field: "start" | "end",
    localValue: string,
  ) {
    setPlayingMode(key, {
      [field]: localValue ? toIsoFromLocal(localValue) : null,
    });
  }

  function setEventPatch(patch: Partial<NonNullable<PlayingState["event"]>>) {
    setPlaying((prev) => ({
      ...prev,
      event: { ...(prev.event ?? {}), ...patch },
    }));
  }

  function setEventDatetime(field: "start" | "end", localValue: string) {
    setEventPatch({ [field]: localValue ? toIsoFromLocal(localValue) : null });
  }

  async function save() {
    setError(null);
    setInfo(null);
    setIsSaving(true);
    try {
      const modes = playing.modes;
      const event = playing.event;
      const body: Parameters<typeof patchPlaying>[1] = {};
      if (showEvent) {
        body.event = {
          start:
            event?.start == null
              ? event?.start
              : toIsoFromLocal(event.start) ?? event.start,
          end:
            event?.end == null
              ? event?.end
              : toIsoFromLocal(event.end) ?? event.end,
          isPaused: Boolean(event?.isPaused),
          isInfinite: Boolean(event?.isInfinite),
        };
        body.eventPaused = Boolean(event?.isPaused);
      }
      if (visibleModes.includes("ctf")) {
        body.ctf = modePatchFromBlock(modes?.ctf ?? { enabled: true });
      }
      if (visibleModes.includes("koth")) {
        // Always send a koth block so backend can create/update the shared session.
        body.koth = {
          ...(modePatchFromBlock(modes?.koth) ?? {}),
          ...(modes?.koth?.sessionId
            ? { sessionId: modes.koth.sessionId }
            : {}),
        };
      }
      if (visibleModes.includes("attackDefense")) {
        body.attackDefense = modePatchFromBlock(modes?.attackDefense);
      }
      const saved = await patchPlaying(hackathonId, body);
      setPlaying(saved);
      onSaved?.(saved);
      notifyPlayingScheduleChanged(hackathonId);
      setInfo("Schedules saved — linked across Hackathon, CTF, and KOTH.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save schedules");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className={`rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5 ${className}`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
            {title}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
        </div>
        {canWrite ? (
          <Button onClick={() => void save()} disabled={isSaving || isLoading}>
            {isSaving ? "Saving…" : "Save schedules"}
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="mb-3">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}
      {info ? (
        <div className="mb-3">
          <Alert variant="success">{info}</Alert>
        </div>
      ) : null}

      {isLoading ? (
        <PageLoader label="Loading schedules…" variant="form" />
      ) : (
        <PlayingModeScheduleBoard
          event={playing.event}
          modes={playing.modes}
          scheduleOrder={playing.scheduleOrder}
          canWrite={canWrite && !isSaving}
          showEvent={showEvent}
          visibleModes={visibleModes}
          onEventChange={setEventPatch}
          onEventDatetimeChange={setEventDatetime}
          onModeChange={setPlayingMode}
          onModeDatetimeChange={setPlayingModeDatetime}
        />
      )}
    </div>
  );
}
