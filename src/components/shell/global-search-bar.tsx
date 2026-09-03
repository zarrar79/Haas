"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BiChip,
  BiGroup,
  BiHelpCircle,
  BiSearch,
  BiServer,
  BiUser,
} from "react-icons/bi";

import { InlineLoader } from "@/components/ui/loader";
import { useEffectiveHackathonId } from "@/features/events/use-effective-hackathon-id";
import {
  runGlobalSearch,
  SEARCH_TYPE_LABELS,
  type GlobalSearchResult,
  type GlobalSearchResultType,
} from "@/features/search/global-search-api";

const TYPE_ICONS: Record<GlobalSearchResultType, typeof BiSearch> = {
  challenge: BiChip,
  team: BiGroup,
  user: BiUser,
  machine: BiServer,
  question: BiHelpCircle,
};

type Props = {
  className?: string;
  inputClassName?: string;
  placeholder?: string;
};

export function GlobalSearchBar({
  className = "",
  inputClassName = "",
  placeholder = "Search users, teams, challenges, machines, questions…",
}: Props) {
  const effectiveHackathonId = useEffectiveHackathonId();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 320);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    if (!debounced) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      setResults(await runGlobalSearch(effectiveHackathonId, debounced));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [debounced, effectiveHackathonId]);

  useEffect(() => {
    if (open && debounced) void load();
    if (!debounced) {
      setResults([]);
      setIsLoading(false);
    }
  }, [open, debounced, load]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const showPanel = open;

  return (
    <div ref={rootRef} className={`relative w-full ${className}`}>
      <input
        type="search"
        value={query}
        placeholder={placeholder}
        className={`w-full rounded-[var(--radius-pill)] border border-[var(--border-strong)] bg-[var(--input-bg)] py-2.5 pl-4 pr-11 text-sm font-medium text-[var(--text)] shadow-[var(--shadow-sm)] outline-none transition placeholder:text-[var(--text-subtle)] focus:border-[var(--accent)]/40 focus:shadow-md ${inputClassName}`}
        aria-label="Deep search"
        aria-expanded={showPanel}
        aria-controls="global-search-results"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      />
      <BiSearch className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg text-[var(--text-muted)]" />

      <div
        id="global-search-results"
        className={`dropdown-panel absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-lg)] ${
          showPanel ? "dropdown-panel-open" : ""
        }`}
      >
        {showPanel ? (
          <div className="max-h-[min(70vh,420px)] overflow-y-auto p-2">
            <p className="px-2 py-1.5 text-[0.65rem] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              {effectiveHackathonId
                ? "Deep search in active event"
                : "Platform search (select an event for machines & questions)"}
            </p>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <InlineLoader label="Searching workspace…" />
              </div>
            ) : !debounced ? (
              <p className="px-3 py-6 text-sm text-[var(--text-muted)]">
                Search users, teams, challenges, machines, IP addresses, and
                questions across the active event.
              </p>
            ) : error ? (
              <p className="px-3 py-4 text-sm text-[var(--danger)]">{error}</p>
            ) : results.length === 0 ? (
              <p className="px-3 py-6 text-sm text-[var(--text-muted)]">
                No matches for &quot;{debounced}&quot;.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {results.map((row) => {
                  const Icon = TYPE_ICONS[row.type];
                  return (
                    <li key={row.id}>
                      <Link
                        href={row.href}
                        className="flex items-start gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 transition hover:bg-[var(--surface-hover)]"
                        onClick={() => setOpen(false)}
                      >
                        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--accent-muted)] text-[var(--accent)]">
                          <Icon className="text-base" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold text-[var(--text)]">
                              {row.title}
                            </span>
                            <span className="rounded-full bg-[var(--surface-raised)] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                              {SEARCH_TYPE_LABELS[row.type]}
                            </span>
                          </span>
                          {row.subtitle ? (
                            <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">
                              {row.subtitle}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
