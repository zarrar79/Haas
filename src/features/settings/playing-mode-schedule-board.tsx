"use client";

import { FormCheckbox } from "@/components/ui/form-fields";
import { TextField } from "@/components/ui/text-field";
import type {
  ModeScheduleBlock,
  PlayingEventWindow,
  PlayingModes,
} from "@/features/settings/settings-api";

function toDatetimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const MODE_LABELS: Record<keyof PlayingModes, string> = {
  ctf: "CTF",
  koth: "KOTH",
  attackDefense: "Attack & Defense",
};

const MODE_HINTS: Record<keyof PlayingModes, string> = {
  ctf: "Jeopardy / challenge play clock — independent of Event time.",
  koth: "King of the Hill round clock — independent of Event / CTF.",
  attackDefense: "Attack & Defense window — independent of Event / CTF.",
};

function modeOutsideEvent(
  block: ModeScheduleBlock | null | undefined,
  event: PlayingEventWindow | null | undefined,
): boolean {
  if (!block?.start || !event?.start || event.isInfinite) return false;
  const modeStart = new Date(block.start).getTime();
  const eventStart = new Date(event.start).getTime();
  if (Number.isNaN(modeStart) || Number.isNaN(eventStart)) return false;
  if (modeStart < eventStart) return true;
  if (block.end && event.end && !event.isInfinite) {
    const modeEnd = new Date(block.end).getTime();
    const eventEnd = new Date(event.end).getTime();
    if (!Number.isNaN(modeEnd) && !Number.isNaN(eventEnd) && modeEnd > eventEnd) {
      return true;
    }
  }
  return false;
}

export type ModeKey = keyof PlayingModes;

const DEFAULT_MODES: ModeKey[] = ["ctf", "koth"];

type Props = {
  event: PlayingEventWindow | null | undefined;
  modes: PlayingModes | undefined;
  scheduleOrder: string[] | undefined;
  canWrite: boolean;
  /** Show Hackathon · Event envelope editors. Default true. */
  showEvent?: boolean;
  /** Which mode cards to show. Default CTF + KOTH (A&D skipped for now). */
  visibleModes?: ModeKey[];
  onEventChange: (patch: Partial<PlayingEventWindow>) => void;
  onEventDatetimeChange: (field: "start" | "end", localValue: string) => void;
  onModeChange: (
    key: keyof PlayingModes,
    patch: Partial<ModeScheduleBlock>,
  ) => void;
  onModeDatetimeChange: (
    key: keyof PlayingModes,
    field: "start" | "end",
    localValue: string,
  ) => void;
};

export function PlayingModeScheduleBoard({
  event,
  modes,
  scheduleOrder,
  canWrite,
  showEvent = true,
  visibleModes = DEFAULT_MODES,
  onEventChange,
  onEventDatetimeChange,
  onModeChange,
  onModeDatetimeChange,
}: Props) {
  const modeKeys = visibleModes.length ? visibleModes : DEFAULT_MODES;
  const order = (scheduleOrder?.length ? scheduleOrder : modeKeys).filter(
    (key) => modeKeys.includes(key as ModeKey),
  );

  return (
    <div className="space-y-5 border-t border-[var(--border)] pt-4">
      {showEvent ? (
        <div className="space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">
              Hackathon · Event
            </h3>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Umbrella event window (overall event / Live). Team create/join is
              controlled separately by Allow team create / join — not this clock.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <FormCheckbox
              label="Infinite event"
              checked={Boolean(event?.isInfinite)}
              disabled={!canWrite}
              onChange={(checked) => onEventChange({ isInfinite: checked })}
            />
            <FormCheckbox
              label="Event paused (freezes all modes)"
              checked={Boolean(event?.isPaused)}
              disabled={!canWrite}
              onChange={(checked) => onEventChange({ isPaused: checked })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Event start"
              name="event_start"
              type="datetime-local"
              disabled={!canWrite || Boolean(event?.isInfinite)}
              value={toDatetimeLocal(event?.start)}
              onChange={(e) => onEventDatetimeChange("start", e.target.value)}
            />
            <TextField
              label="Event end"
              name="event_end"
              type="datetime-local"
              disabled={!canWrite || Boolean(event?.isInfinite)}
              value={toDatetimeLocal(event?.end)}
              onChange={(e) => onEventDatetimeChange("end", e.target.value)}
            />
          </div>
        </div>
      ) : null}

      <div>
        <h3 className="text-sm font-semibold text-[var(--text)]">
          Mode schedule order
        </h3>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          Ordered by each mode&apos;s own start time (not Event start).
        </p>
        <p className="mt-2 flex flex-wrap gap-2 text-xs">
          {order.map((key, i) => (
            <span
              key={key}
              className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 font-medium text-[var(--text)]"
            >
              {i + 1}. {MODE_LABELS[key as keyof PlayingModes] ?? key}
            </span>
          ))}
          {!order.length ? (
            <span className="text-[var(--text-muted)]">No scheduled modes yet.</span>
          ) : null}
        </p>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold text-[var(--text)]">
          Mode times
        </h3>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          Each track has its own start / end. Changing Event time does not change
          CTF or KOTH.
        </p>
        <div
          className={`grid gap-3 ${modeKeys.length > 1 ? "lg:grid-cols-2" : "lg:grid-cols-1"} ${modeKeys.length > 2 ? "xl:grid-cols-3" : ""}`}
        >
          {modeKeys.map((key) => {
            const block = modes?.[key] ?? {};
            const phase = block.phase ?? "not_set";
            const showInfinite = key === "ctf";
            const warnOutside = modeOutsideEvent(block, event);
            const kothNeedsSession =
              key === "koth" && !block.sessionId && !block.start && !block.end;
            return (
              <div
                key={key}
                className="space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text)]">
                      {MODE_LABELS[key]} time
                    </h4>
                    <p className="mt-0.5 text-[10px] leading-snug text-[var(--text-muted)]">
                      {MODE_HINTS[key]}
                      {key === "koth" && block.sessionId
                        ? " Linked to the active KOTH session — edits sync with Sessions / Play window."
                        : key === "ctf"
                          ? " Linked to the CTF track — edits sync with CTF → Play window."
                          : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                    {phase}
                    {block.isOpen ? " · open" : ""}
                  </span>
                </div>
                {kothNeedsSession ? (
                  <p className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[11px] text-[var(--text-muted)]">
                    No active KOTH session yet — create one under KOTH, then set
                    the round times here.
                  </p>
                ) : null}
                {warnOutside ? (
                  <p className="rounded-[var(--radius-sm)] border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-800 dark:text-amber-200">
                    This mode window sits outside the Event envelope (allowed,
                    but check you meant that).
                  </p>
                ) : null}
                {key !== "koth" ? (
                  <FormCheckbox
                    label="Enabled"
                    checked={Boolean(block.enabled)}
                    disabled={!canWrite}
                    onChange={(checked) =>
                      onModeChange(key, { enabled: checked })
                    }
                  />
                ) : null}
                {showInfinite ? (
                  <FormCheckbox
                    label="Infinite CTF"
                    checked={Boolean(block.isInfinite)}
                    disabled={!canWrite}
                    onChange={(checked) =>
                      onModeChange(key, { isInfinite: checked })
                    }
                  />
                ) : null}
                <FormCheckbox
                  label={`${MODE_LABELS[key]} paused`}
                  checked={Boolean(block.isPaused)}
                  disabled={!canWrite || (key === "koth" && kothNeedsSession)}
                  onChange={(checked) =>
                    onModeChange(key, { isPaused: checked })
                  }
                />
                <TextField
                  label={`${MODE_LABELS[key]} start`}
                  name={`${key}_start`}
                  type="datetime-local"
                  disabled={
                    !canWrite ||
                    Boolean(block.isInfinite) ||
                    (key === "koth" && kothNeedsSession)
                  }
                  value={toDatetimeLocal(block.start)}
                  onChange={(e) =>
                    onModeDatetimeChange(key, "start", e.target.value)
                  }
                />
                <TextField
                  label={`${MODE_LABELS[key]} end`}
                  name={`${key}_end`}
                  type="datetime-local"
                  disabled={
                    !canWrite ||
                    Boolean(block.isInfinite) ||
                    (key === "koth" && kothNeedsSession)
                  }
                  value={toDatetimeLocal(block.end)}
                  onChange={(e) =>
                    onModeDatetimeChange(key, "end", e.target.value)
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
