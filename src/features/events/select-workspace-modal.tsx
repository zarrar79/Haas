"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import {
  buildEventWorkspacePath,
  isEventWorkspaceNavHref,
} from "@/components/shell/nav-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InlineLoader } from "@/components/ui/loader";
import { ModalShell } from "@/components/ui/modal-shell";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { listHackathons } from "@/features/hackathons/hackathon-api";
import type { Hackathon } from "@/types/hackathon";

type SelectWorkspaceRequest = {
  rawHref: string;
  label: string;
};

type SelectWorkspaceContextValue = {
  openSelectWorkspace: (request: SelectWorkspaceRequest) => void;
};

const SelectWorkspaceContext = createContext<SelectWorkspaceContextValue | null>(
  null,
);

function isInfiniteEvent(hackathon: Hackathon) {
  return Boolean(hackathon.is_infinite || !hackathon.end_datetime);
}

function formatSchedule(hackathon: Hackathon) {
  if (isInfiniteEvent(hackathon)) return null;
  const start = hackathon.start_datetime
    ? new Date(hackathon.start_datetime)
    : null;
  const end = hackathon.end_datetime
    ? new Date(hackathon.end_datetime)
    : null;
  const fmt = (date: Date) =>
    date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
    return `${fmt(start)} – ${fmt(end)}`;
  }
  if (start && !Number.isNaN(start.getTime())) return `Starts ${fmt(start)}`;
  if (end && !Number.isNaN(end.getTime())) return `Ends ${fmt(end)}`;
  return null;
}

function sortHackathons(items: Hackathon[]) {
  return [...items].sort((a, b) => {
    const aActive = a.is_active ? 1 : 0;
    const bActive = b.is_active ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    const aName = (a.display_name || a.name || "").toLowerCase();
    const bName = (b.display_name || b.name || "").toLowerCase();
    return aName.localeCompare(bName);
  });
}

function eventInitial(hackathon: Hackathon) {
  const label = hackathon.display_name || hackathon.name || "?";
  return label.charAt(0).toUpperCase();
}

function WorkspaceEventCard({
  hackathon,
  selected,
  onSelect,
}: {
  hackathon: Hackathon;
  selected: boolean;
  onSelect: () => void;
}) {
  const title = hackathon.display_name || hackathon.name;
  const schedule = formatSchedule(hackathon);
  const infinite = isInfiniteEvent(hackathon);

  return (
    <button
      type="button"
      className={`flex w-full items-center gap-3 rounded-[var(--radius-lg)] border px-3 py-3 text-left transition ${
        selected
          ? "border-[var(--accent)] bg-[var(--accent-muted)]"
          : "border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--accent)]/40 hover:bg-[var(--surface-hover)]"
      }`}
      onClick={onSelect}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-sm font-bold ${
          selected
            ? "bg-[var(--accent)] text-[var(--accent-fg)]"
            : "bg-[var(--accent-muted)] text-[var(--accent)]"
        }`}
        aria-hidden
      >
        {eventInitial(hackathon)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-[var(--text)]">
            {title}
          </span>
          {hackathon.is_active ? (
            <Badge tone="success">Active</Badge>
          ) : (
            <Badge>Inactive</Badge>
          )}
          {infinite ? <Badge tone="success">Infinite</Badge> : null}
          {selected ? <Badge tone="warning">Current</Badge> : null}
        </span>
        {schedule || hackathon.city ? (
          <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
            {schedule ? <span>{schedule}</span> : null}
            {hackathon.city ? <span>{hackathon.city}</span> : null}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export function SelectWorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { selectedHackathonId, setSelectedHackathonId } = useSelectedEvent();
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState<SelectWorkspaceRequest | null>(null);
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const openSelectWorkspace = useCallback((next: SelectWorkspaceRequest) => {
    setRequest(next);
    setSearch("");
    setOpen(true);
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    void (async () => {
      try {
        const { items } = await listHackathons({ show_deleted: "false" });
        setHackathons(sortHackathons(items));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load events");
        setHackathons([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [open]);

  const filteredHackathons = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return hackathons;
    return hackathons.filter((h) => {
      const haystack = [h.display_name, h.name, h.city, h.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [hackathons, search]);

  function close() {
    setOpen(false);
    setRequest(null);
    setSearch("");
    setError(null);
  }

  function enterWorkspace(hackathonId: string) {
    if (!request) return;
    setSelectedHackathonId(hackathonId);
    router.push(buildEventWorkspacePath(hackathonId, request.rawHref));
    close();
  }

  const value = useMemo(
    () => ({ openSelectWorkspace }),
    [openSelectWorkspace],
  );

  return (
    <SelectWorkspaceContext.Provider value={value}>
      {children}
      <ModalShell
        open={open}
        onClose={close}
        panelClassName="max-w-lg"
        ariaLabel="Select event workspace"
      >
        <div className="border-b border-[var(--border)] px-3 sm:px-5 py-4">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Select event workspace
          </h2>
        </div>

        <div className="border-b border-[var(--border)] px-3 sm:px-5 py-3">
          <label className="block">
            <span className="sr-only">Search events</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events…"
              className="w-full rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-subtle)] focus:border-[var(--accent)]/40"
            />
          </label>
        </div>

        <div className="min-h-[220px] max-h-[min(52vh,380px)] overflow-y-auto px-3 sm:px-5 py-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <InlineLoader label="Loading events…" />
            </div>
          ) : error ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--danger)]/30 bg-[var(--danger-muted)] px-4 py-3 text-sm text-[var(--danger)]">
              {error}
            </div>
          ) : hackathons.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">
              No events available.
            </p>
          ) : filteredHackathons.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">
              No matches for &ldquo;{search.trim()}&rdquo;.
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredHackathons.map((h) => (
                <li key={h.id}>
                  <WorkspaceEventCard
                    hackathon={h}
                    selected={selectedHackathonId === h.id}
                    onSelect={() => enterWorkspace(h.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end border-t border-[var(--border)] px-3 sm:px-5 py-4">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
        </div>
      </ModalShell>
    </SelectWorkspaceContext.Provider>
  );
}

export function useSelectWorkspace() {
  const ctx = useContext(SelectWorkspaceContext);
  if (!ctx) {
    throw new Error(
      "useSelectWorkspace must be used within SelectWorkspaceProvider",
    );
  }
  return ctx;
}

export function useHackathonDisplayName(hackathonId: string | null) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!hackathonId) {
      setLabel(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { items } = await listHackathons({ show_deleted: "false" });
        if (cancelled) return;
        const match = items.find((h) => h.id === hackathonId);
        setLabel(match?.display_name || match?.name || null);
      } catch {
        if (!cancelled) setLabel(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hackathonId]);

  return label;
}

/** Open picker when href is event workspace and no hackathon selected. */
export function useEventWorkspaceNavAction(
  rawHref: string,
  label: string,
  hackathonId: string | null,
) {
  const { openSelectWorkspace } = useSelectWorkspace();
  const locked = isEventWorkspaceNavHref(rawHref) && !hackathonId;

  const onLockedClick = useCallback(() => {
    openSelectWorkspace({ rawHref, label });
  }, [openSelectWorkspace, rawHref, label]);

  return { locked, onLockedClick };
}
