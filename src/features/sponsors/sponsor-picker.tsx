"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { listSponsors, type Sponsor } from "@/features/sponsors/sponsor-api";
import { SponsorFormModal } from "@/features/sponsors/sponsor-form-modal";

type Props = {
  selectedIds: string[];
  onChange: (ids: string[], sponsors: Sponsor[]) => void;
  disabled?: boolean;
};

export function SponsorPicker({ selectedIds, onChange, disabled = false }: Props) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Sponsor[]>([]);
  const [selected, setSelected] = useState<Sponsor[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    setIsSearching(true);
    try {
      const rows = await listSponsors({
        search: q.trim() || undefined,
        active: "true",
      });
      setResults(rows);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    void runSearch("");
  }, [runSearch]);

  useEffect(() => {
    if (selectedIds.length === 0) {
      setSelected([]);
      return;
    }
    const missing = selectedIds.filter((id) => !selected.some((s) => s.id === id));
    if (missing.length === 0) {
      setSelected((prev) => prev.filter((s) => selectedIds.includes(s.id)));
      return;
    }
    let cancelled = false;
    void listSponsors({ limit: "200" }).then((rows) => {
      if (cancelled) return;
      const byId = new Map(rows.map((r) => [r.id, r]));
      const next = selectedIds
        .map((id) => byId.get(id) || selected.find((s) => s.id === id))
        .filter(Boolean) as Sponsor[];
      setSelected(next);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate from selectedIds only
  }, [selectedIds.join(",")]);

  function addSponsor(sponsor: Sponsor) {
    if (selectedIds.includes(sponsor.id)) return;
    const next = [...selected, sponsor];
    setSelected(next);
    onChange(
      next.map((s) => s.id),
      next,
    );
  }

  function removeSponsor(id: string) {
    const next = selected.filter((s) => s.id !== id);
    setSelected(next);
    onChange(
      next.map((s) => s.id),
      next,
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-[var(--text)]">Sponsors</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/sponsors"
            className="text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Manage sponsors
          </Link>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={disabled}
            onClick={() => setCreateOpen(true)}
          >
            New sponsor
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <TextField
          label="Search sponsors"
          name="sponsor_search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name…"
          disabled={disabled}
        />
        <div className="flex items-end">
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || isSearching}
            onClick={() => void runSearch(search)}
          >
            {isSearching ? "Searching…" : "Search"}
          </Button>
        </div>
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((sponsor) => (
            <span
              key={sponsor.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--text)]"
            >
              {sponsor.name}
              <button
                type="button"
                className="text-[var(--text-muted)] hover:text-[var(--danger)]"
                disabled={disabled}
                onClick={() => removeSponsor(sponsor.id)}
                aria-label={`Remove ${sponsor.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">
          Search and add sponsors for this event (optional). Create new ones here or
          on the Sponsors page.
        </p>
      )}

      <ul className="max-h-48 space-y-1 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] p-2">
        {results.length === 0 ? (
          <li className="px-2 py-3 text-center text-xs text-[var(--text-muted)]">
            No sponsors found.
          </li>
        ) : (
          results.map((sponsor) => {
            const picked = selectedIds.includes(sponsor.id);
            return (
              <li key={sponsor.id}>
                <button
                  type="button"
                  disabled={disabled || picked}
                  className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2 py-2 text-left text-sm transition hover:bg-[var(--surface-hover)] ${
                    picked ? "opacity-50" : ""
                  }`}
                  onClick={() => addSponsor(sponsor)}
                >
                  <span>
                    <span className="font-medium text-[var(--text)]">
                      {sponsor.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                      {[sponsor.tag, sponsor.organization_type]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {picked ? (
                    <span className="text-xs text-[var(--text-muted)]">Added</span>
                  ) : (
                    <span className="text-xs text-[var(--accent)]">Add</span>
                  )}
                </button>
              </li>
            );
          })
        )}
      </ul>

      <SponsorFormModal
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSaved={(created) => {
          addSponsor(created);
          void runSearch(search);
        }}
      />
    </div>
  );
}
