"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
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
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-[var(--text)]">Organization</p>
        <div className="flex flex-wrap gap-2">
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
        </div>
      </div>

      {selected ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--text)]">
            {selected.name}
            <button
              type="button"
              className="text-[var(--text-muted)] hover:text-[var(--danger)]"
              disabled={disabled}
              onClick={clear}
              aria-label="Clear organization"
            >
              ×
            </button>
          </span>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">
          Optional. Search or create an organization for this event.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <TextField
          label="Search organizations"
          name="org_search"
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

      <ul className="max-h-40 space-y-1 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] p-2">
        {results.length === 0 ? (
          <li className="px-2 py-3 text-center text-xs text-[var(--text-muted)]">
            No organizations found.
          </li>
        ) : (
          results.map((org) => {
            const picked = selectedId === org.id;
            return (
              <li key={org.id}>
                <button
                  type="button"
                  disabled={disabled || picked}
                  className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2 py-2 text-left text-sm transition hover:bg-[var(--surface-hover)] ${
                    picked ? "opacity-50" : ""
                  }`}
                  onClick={() => pick(org)}
                >
                  <span className="font-medium text-[var(--text)]">{org.name}</span>
                  {picked ? (
                    <span className="text-xs text-[var(--text-muted)]">Selected</span>
                  ) : (
                    <span className="text-xs text-[var(--accent)]">Select</span>
                  )}
                </button>
              </li>
            );
          })
        )}
      </ul>

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
    </div>
  );
}
