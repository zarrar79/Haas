"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { SearchPicker } from "@/components/ui/search-picker";
import { listSponsors, type Sponsor } from "@/features/sponsors/sponsor-api";
import { SponsorFormModal } from "@/features/sponsors/sponsor-form-modal";

type Props = {
  selectedIds: string[];
  onChange: (ids: string[], sponsors: Sponsor[]) => void;
  hackathonId?: string;
  disabled?: boolean;
};

export function SponsorPicker({
  selectedIds,
  onChange,
  hackathonId,
  disabled = false,
}: Props) {
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
    <SearchPicker
      title="Sponsors"
      headerActions={
        <>
          {hackathonId ? (
            <Link
              href={`/events/${hackathonId}/hackathon?tab=sponsors`}
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              Manage sponsors
            </Link>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={disabled}
            onClick={() => setCreateOpen(true)}
          >
            New sponsor
          </Button>
        </>
      }
      searchLabel="Search sponsors"
      searchName="sponsor_search"
      searchPlaceholder="Name…"
      search={search}
      onSearchChange={setSearch}
      onSearch={() => void runSearch(search)}
      isSearching={isSearching}
      disabled={disabled}
      emptyHint="Search and add sponsors for this event (optional). Create new ones here or on the Sponsors page."
      emptyResults="No sponsors found."
      selected={selected}
      results={results}
      isSelected={(sponsor) => selectedIds.includes(sponsor.id)}
      onAdd={addSponsor}
      onRemove={(sponsor) => removeSponsor(sponsor.id)}
      getLabel={(sponsor) => sponsor.name}
      getSubtitle={(sponsor) =>
        [sponsor.tag, sponsor.organization_type].filter(Boolean).join(" · ") ||
        undefined
      }
    >
      <SponsorFormModal
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSaved={(created) => {
          addSponsor(created);
          void runSearch(search);
        }}
      />
    </SearchPicker>
  );
}
