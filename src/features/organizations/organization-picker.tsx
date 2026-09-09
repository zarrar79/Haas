"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { SearchPicker } from "@/components/ui/search-picker";
import {
  listOrganizations,
  type Organization,
} from "@/features/organizations/organization-api";
import { OrganizationFormModal } from "@/features/organizations/organization-form-modal";

type Props = {
  hackathonId: string;
  selectedId: string | null;
  onChange: (id: string | null, org: Organization | null) => void;
  disabled?: boolean;
};

export function OrganizationPicker({
  hackathonId,
  selectedId,
  onChange,
  disabled = false,
}: Props) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Organization[]>([]);
  const [selected, setSelected] = useState<Organization | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const runSearch = useCallback(
    async (q: string) => {
      if (!hackathonId) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const rows = await listOrganizations({
          hackathon: hackathonId,
          search: q.trim() || undefined,
          is_active: "true",
        });
        setResults(rows);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [hackathonId],
  );

  useEffect(() => {
    void runSearch("");
  }, [runSearch]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    if (selected?.id === selectedId) return;
    const fromResults = results.find((r) => r.id === selectedId);
    if (fromResults) {
      setSelected(fromResults);
      return;
    }
    let cancelled = false;
    void listOrganizations({ hackathon: hackathonId, limit: "200" }).then(
      (rows) => {
        if (cancelled) return;
        setSelected(rows.find((r) => r.id === selectedId) || null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [selectedId, results, selected?.id, hackathonId]);

  function pick(org: Organization) {
    setSelected(org);
    onChange(org.id, org);
  }

  function clear() {
    setSelected(null);
    onChange(null, null);
  }

  if (!hackathonId) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Save the hackathon first, then add organizations for this event.
      </p>
    );
  }

  return (
    <SearchPicker
      title="Organization"
      headerActions={
        <>
          <Link
            href={`/events/${hackathonId}/hackathon?tab=organizations`}
            className="text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Manage organizations
          </Link>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={disabled}
            onClick={() => setCreateOpen(true)}
          >
            New organization
          </Button>
        </>
      }
      searchLabel="Search organizations"
      searchName="org_search"
      searchPlaceholder="Name…"
      search={search}
      onSearchChange={setSearch}
      onSearch={() => void runSearch(search)}
      isSearching={isSearching}
      disabled={disabled}
      emptyHint="Optional. Search or create an organization for this event."
      emptyResults="No organizations found."
      selected={selected ? [selected] : []}
      results={results}
      isSelected={(org) => selectedId === org.id}
      onAdd={pick}
      onRemove={clear}
      getLabel={(org) => org.name}
      removeAriaLabel={() => "Clear organization"}
      pickedLabel="Selected"
      addLabel="Select"
      listMaxHeightClass="max-h-40"
    >
      <OrganizationFormModal
        open={createOpen}
        mode="create"
        hackathonId={hackathonId}
        onClose={() => setCreateOpen(false)}
        onSaved={(org) => {
          pick(org);
          void runSearch(search);
        }}
      />
    </SearchPicker>
  );
}
