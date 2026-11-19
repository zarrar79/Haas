"use client";

import { hackathonLabel } from "@/lib/display-name";

export type PlayingHackathonRef = {
  id: string;
  name?: string;
  display_name?: string;
};

type Props = {
  events: PlayingHackathonRef[];
  busy?: boolean;
  emptyLabel?: string;
  onRemove: (hackathonId: string) => void;
};

/** Removable chips for live playing-hackathon membership. */
export function PlayingInChips({
  events,
  busy = false,
  emptyLabel = "—",
  onRemove,
}: Props) {
  if (events.length === 0) {
    return (
      <span className="text-xs text-[var(--text-muted)]">{emptyLabel}</span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {events.map((h) => {
        const label = hackathonLabel(h);
        return (
          <span
            key={h.id}
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--success-muted)] px-2 py-0.5 text-xs font-medium text-[var(--success)]"
            title={label}
          >
            <span className="truncate">{label}</span>
            <button
              type="button"
              className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[var(--success)] hover:bg-[var(--danger-muted)] hover:text-[var(--danger)] disabled:opacity-40"
              aria-label={`Remove from ${label}`}
              title={`Remove from ${label}`}
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(h.id);
              }}
            >
              <span aria-hidden className="text-[11px] leading-none">
                ×
              </span>
            </button>
          </span>
        );
      })}
    </div>
  );
}
