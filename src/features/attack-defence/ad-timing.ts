/**
 * Client-side AD wall-clock end formula — must match
 * cyberrange/src/apps/ad/ad_scorer_services/timing.py
 *
 * play_seconds = total_rounds × round_duration_sec  (fixed competition length)
 * end = start + play_seconds + sum(pause_durations)  (pauses are extra wall-clock)
 * duration_minutes = play only (excludes pauses)
 */

export type AdPauseTimingInput = {
  duration_seconds?: number | null;
  duration_sec?: number | null;
  /** ISO duration string from DRF DurationField, e.g. "00:15:00" */
  duration?: string | null;
  type?: string | null;
  status?: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

export function playSeconds(totalRounds: number, roundDurationSec: number): number {
  return Math.max(0, Math.floor(totalRounds || 0) * Math.floor(roundDurationSec || 0));
}

export function playDurationMinutes(
  totalRounds: number,
  roundDurationSec: number,
): number | null {
  const seconds = playSeconds(totalRounds, roundDurationSec);
  if (seconds <= 0) return null;
  return Math.max(1, Math.floor(seconds / 60));
}

/** Parse DRF duration "DD HH:MM:SS" / "HH:MM:SS" / seconds number. */
export function durationToSeconds(
  value: string | number | null | undefined,
): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  const raw = String(value).trim();
  if (/^\d+(\.\d+)?$/.test(raw)) {
    return Math.max(0, Math.floor(Number(raw)));
  }
  // "[-][D ][HH:]MM:SS[.uuuuuu]"
  const m = raw.match(
    /^(-)?(?:(\d+)\s+)?(?:(\d+):)?(\d+):(\d+)(?:\.\d+)?$/,
  );
  if (!m) return 0;
  const sign = m[1] ? -1 : 1;
  const days = Number(m[2] || 0);
  const hours = Number(m[3] || 0);
  const minutes = Number(m[4] || 0);
  const seconds = Number(m[5] || 0);
  return sign * (days * 86400 + hours * 3600 + minutes * 60 + seconds);
}

export function pauseDurationSeconds(
  pause: AdPauseTimingInput,
  now: Date = new Date(),
): number {
  if (
    pause.type === "runtime" &&
    pause.status === "ongoing" &&
    pause.start_time
  ) {
    const start = new Date(pause.start_time).getTime();
    if (Number.isNaN(start)) return 0;
    return Math.max(0, Math.floor((now.getTime() - start) / 1000));
  }
  if (pause.duration_seconds != null) {
    return Math.max(0, Math.floor(pause.duration_seconds));
  }
  if (pause.duration_sec != null) {
    return Math.max(0, Math.floor(pause.duration_sec));
  }
  return Math.max(0, durationToSeconds(pause.duration));
}

export function sumPauseSeconds(
  pauses: AdPauseTimingInput[],
  now: Date = new Date(),
): number {
  return pauses.reduce((sum, p) => sum + pauseDurationSeconds(p, now), 0);
}

export function computeEventEndDatetime(input: {
  startDatetime: string | null | undefined;
  totalRounds: number;
  roundDurationSec: number;
  pauses?: AdPauseTimingInput[];
  now?: Date;
}): string | null {
  if (!input.startDatetime) return null;
  const start = new Date(input.startDatetime);
  if (Number.isNaN(start.getTime())) return null;
  const play = playSeconds(input.totalRounds, input.roundDurationSec);
  if (play <= 0) return null;
  const pauseSecs = sumPauseSeconds(input.pauses ?? [], input.now ?? new Date());
  return new Date(start.getTime() + (play + pauseSecs) * 1000).toISOString();
}

export function formatDurationLabel(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
