"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { ListPageStat, ListPageStats } from "@/components/ui/list-page-stats";
import { FilterSelect, StickyToolbar } from "@/components/ui/sticky-toolbar";
import {
  listCatalog,
  type CatalogItem,
  type CatalogKind,
} from "@/features/catalog/catalog-api";
import { CatalogCreateModal } from "@/features/catalog/catalog-create-modal";
import {
  CATALOG_KINDS,
  getCatalogKindConfig,
} from "@/features/catalog/catalog-kind-config";
import { ApiRequestError } from "@/lib/client-api";

const SEARCH_INPUT_CLASS =
  "rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--input-bg)] px-2 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] transition-all duration-200 focus:border-[var(--accent)]/40 focus:shadow-[var(--shadow-sm)]";

export function CatalogView() {
  const router = useRouter();
  const [kind, setKind] = useState<CatalogKind>("categories");
  const [rows, setRows] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [skills, setSkills] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const config = useMemo(() => getCatalogKindConfig(kind), [kind]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!config.supportsSkillFilter) {
      setSkills([]);
      return;
    }
    let cancelled = false;
    void listCatalog("skills")
      .then((items) => {
        if (!cancelled) setSkills(items);
      })
      .catch(() => {
        if (!cancelled) setSkills([]);
      });
    return () => {
      cancelled = true;
    };
  }, [config.supportsSkillFilter]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setRows(
        await listCatalog(kind, {
          search: debouncedSearch || undefined,
          skill:
            config.supportsSkillFilter && skillFilter ? skillFilter : undefined,
        }),
      );
    } catch (err) {
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load catalog");
    } finally {
      setIsLoading(false);
    }
  }, [kind, debouncedSearch, skillFilter, config.supportsSkillFilter, router]);

  useEffect(() => {
    void load();
  }, [load]);

  function onKindChange(next: CatalogKind) {
    setKind(next);
    setSearch("");
    setDebouncedSearch("");
    setSkillFilter("");
  }

  const hasFilters = Boolean(debouncedSearch || skillFilter);

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Platform"
        title="Catalog"
        actions={
          <Button variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      <StickyToolbar
        layout="plain"
        footer={
          <ListPageStats>
            <ListPageStat label="Items" value={rows.length} />
            {debouncedSearch ? (
              <>
                <span className="text-[var(--text-muted)]">·</span>
                <span className="text-[var(--accent)]">
                  Matching &ldquo;{debouncedSearch}&rdquo;
                </span>
              </>
            ) : null}
          </ListPageStats>
        }
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
            <label className="flex min-w-[11rem] flex-1 flex-col gap-1 text-xs text-[var(--text-muted)] sm:max-w-xs">
              <span className="font-medium text-[var(--text)]">Search</span>
              <input
                name="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${config.label.toLowerCase()}…`}
                className={SEARCH_INPUT_CLASS}
              />
            </label>

            {CATALOG_KINDS.map((k) => (
              <div key={k.id} className="flex shrink-0 items-end pb-0.5">
                <Button
                  size="sm"
                  variant={kind === k.id ? "primary" : "secondary"}
                  onClick={() => onKindChange(k.id)}
                >
                  {k.label}
                </Button>
              </div>
            ))}

            {config.supportsSkillFilter ? (
              <FilterSelect
                label="Skill"
                value={skillFilter}
                onChange={setSkillFilter}
                className="min-w-[10rem]"
              >
                <option value="">All skills</option>
                {skills.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name || item.id}
                  </option>
                ))}
              </FilterSelect>
            ) : null}

            {hasFilters ? (
              <div className="flex shrink-0 items-end pb-0.5">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setDebouncedSearch("");
                    setSkillFilter("");
                  }}
                >
                  Clear
                </Button>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-end pb-0.5">
            <Button onClick={() => setCreateOpen(true)}>
              Create {config.singular}
            </Button>
          </div>
        </div>
      </StickyToolbar>

      {error ? (
        <div className="mb-3">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      <DataTable
        isLoading={isLoading}
        rows={rows}
        rowKey={(r) => r.id}
        emptyMessage={`No ${config.label.toLowerCase()}.`}
        columns={config.columns}
      />

      <CatalogCreateModal
        open={createOpen}
        kind={kind}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void load()}
      />
    </div>
  );
}
