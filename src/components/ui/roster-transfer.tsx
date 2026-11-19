"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type RosterItem = {
  id: string;
  label: string;
  meta?: string;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 20;

type Props = {
  title: string;
  description?: string;
  available: RosterItem[];
  added: RosterItem[];
  availableLabel?: string;
  addedLabel?: string;
  busy?: boolean;
  pageSizeOptions?: readonly number[];
  defaultPageSize?: number;
  onAdd: (ids: string[]) => Promise<void> | void;
  onRemove: (ids: string[]) => Promise<void> | void;
};

function filterItems(items: RosterItem[], q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return items;
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(needle) ||
      (item.meta || "").toLowerCase().includes(needle) ||
      item.id.toLowerCase().includes(needle),
  );
}

function ColumnPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions: readonly number[];
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-3 py-2 text-[11px] text-[var(--text-muted)] sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <span>
          {from}–{to} of {total}
        </span>
        <label className="flex items-center gap-1">
          <span>Rows</span>
          <select
            className="rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--input-bg)] px-1.5 py-1 text-[11px] text-[var(--text)] outline-none"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          Prev
        </Button>
        <span className="min-w-[3.5rem] text-center font-medium text-[var(--text)]">
          {safePage}/{totalPages}
        </span>
        <Button
          size="sm"
          variant="ghost"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function Column({
  title,
  count,
  search,
  onSearch,
  items,
  selected,
  onToggle,
  onToggleAll,
  onDoubleClick,
  emptyText,
  tone,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
  disabled,
}: {
  title: string;
  count: number;
  search: string;
  onSearch: (v: string) => void;
  items: RosterItem[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onDoubleClick: (id: string) => void;
  emptyText: string;
  tone: "available" | "added";
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions: readonly number[];
  disabled?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageItems = items.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );
  const allVisibleSelected =
    pageItems.length > 0 && pageItems.every((item) => selected.has(item.id));

  return (
    <div
      className={`flex min-h-[22rem] flex-col rounded-[var(--radius-lg)] border bg-[var(--surface)] ${
        tone === "added"
          ? "border-[var(--accent)]/25"
          : "border-[var(--border)]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2.5 sm:px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--text)]">
            {title}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {count} total · double-click to move
          </p>
        </div>
        <Badge tone={tone === "added" ? "success" : "neutral"}>{count}</Badge>
      </div>

      <div className="border-b border-[var(--border)] px-3 py-2 sm:px-4">
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={`Search ${title.toLowerCase()}…`}
          className="w-full rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-subtle)] focus:border-[var(--accent)]/40"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            className="text-[11px] font-medium text-[var(--accent)] hover:underline disabled:opacity-40"
            onClick={onToggleAll}
            disabled={pageItems.length === 0 || disabled}
          >
            {allVisibleSelected ? "Clear page" : "Select page"}
          </button>
          <span className="text-[11px] text-[var(--text-muted)]">
            {selected.size} selected
          </span>
        </div>
      </div>

      <ul className="flex-1 space-y-1 overflow-y-auto px-2 py-2 sm:px-3">
        {pageItems.length === 0 ? (
          <li className="px-2 py-8 text-center text-xs text-[var(--text-muted)]">
            {emptyText}
          </li>
        ) : (
          pageItems.map((item) => {
            const checked = selected.has(item.id);
            return (
              <li key={item.id}>
                <label
                  className={`flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-md)] border px-2.5 py-2 transition ${
                    checked
                      ? "border-[var(--accent)]/40 bg-[var(--accent-muted)]"
                      : "border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-hover)]"
                  } ${disabled ? "pointer-events-none opacity-60" : ""}`}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    if (!disabled) onDoubleClick(item.id);
                  }}
                  title="Double-click to move"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => onToggle(item.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[var(--text)]">
                      {item.label}
                    </span>
                    {item.meta ? (
                      <span className="block truncate text-[11px] text-[var(--text-muted)]">
                        {item.meta}
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })
        )}
      </ul>

      <ColumnPagination
        page={safePage}
        pageSize={pageSize}
        total={items.length}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageSizeOptions={pageSizeOptions}
      />
    </div>
  );
}

export function RosterTransfer({
  title,
  description,
  available,
  added,
  availableLabel = "Available",
  addedLabel = "Added",
  busy = false,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  defaultPageSize = DEFAULT_PAGE_SIZE,
  onAdd,
  onRemove,
}: Props) {
  const [availableSearch, setAvailableSearch] = useState("");
  const [addedSearch, setAddedSearch] = useState("");
  const [selectedAvailable, setSelectedAvailable] = useState<Set<string>>(
    new Set(),
  );
  const [selectedAdded, setSelectedAdded] = useState<Set<string>>(new Set());
  const [localBusy, setLocalBusy] = useState(false);
  const [availablePage, setAvailablePage] = useState(1);
  const [addedPage, setAddedPage] = useState(1);
  const [availablePageSize, setAvailablePageSize] = useState(defaultPageSize);
  const [addedPageSize, setAddedPageSize] = useState(defaultPageSize);

  const availableView = useMemo(
    () => filterItems(available, availableSearch),
    [available, availableSearch],
  );
  const addedView = useMemo(
    () => filterItems(added, addedSearch),
    [added, addedSearch],
  );

  useEffect(() => {
    setAvailablePage(1);
  }, [availableSearch, availablePageSize, available.length]);

  useEffect(() => {
    setAddedPage(1);
  }, [addedSearch, addedPageSize, added.length]);

  const isBusy = busy || localBusy;

  function toggle(set: Set<string>, id: string, setter: (next: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  function toggleAll(
    items: RosterItem[],
    selected: Set<string>,
    setter: (next: Set<string>) => void,
  ) {
    const ids = items.map((item) => item.id);
    const allOn = ids.length > 0 && ids.every((id) => selected.has(id));
    if (allOn) {
      const next = new Set(selected);
      for (const id of ids) next.delete(id);
      setter(next);
      return;
    }
    const next = new Set(selected);
    for (const id of ids) next.add(id);
    setter(next);
  }

  async function addSelected(ids?: string[]) {
    const nextIds = (ids ?? [...selectedAvailable]).filter((id) =>
      available.some((item) => item.id === id),
    );
    if (nextIds.length === 0) return;
    setLocalBusy(true);
    try {
      await onAdd(nextIds);
      setSelectedAvailable(new Set());
    } finally {
      setLocalBusy(false);
    }
  }

  async function removeSelected(ids?: string[]) {
    const nextIds = (ids ?? [...selectedAdded]).filter((id) =>
      added.some((item) => item.id === id),
    );
    if (nextIds.length === 0) return;
    setLocalBusy(true);
    try {
      await onRemove(nextIds);
      setSelectedAdded(new Set());
    } finally {
      setLocalBusy(false);
    }
  }

  const availablePageItems = availableView.slice(
    (availablePage - 1) * availablePageSize,
    availablePage * availablePageSize,
  );
  const addedPageItems = addedView.slice(
    (addedPage - 1) * addedPageSize,
    addedPage * addedPageSize,
  );

  return (
    <section className="space-y-3">
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs text-[var(--text-muted)]">{description}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
        <Column
          title={availableLabel}
          count={available.length}
          search={availableSearch}
          onSearch={setAvailableSearch}
          items={availableView}
          selected={selectedAvailable}
          onToggle={(id) =>
            toggle(selectedAvailable, id, setSelectedAvailable)
          }
          onToggleAll={() =>
            toggleAll(
              availablePageItems,
              selectedAvailable,
              setSelectedAvailable,
            )
          }
          onDoubleClick={(id) => void addSelected([id])}
          emptyText="No available items."
          tone="available"
          page={availablePage}
          pageSize={availablePageSize}
          onPageChange={setAvailablePage}
          onPageSizeChange={setAvailablePageSize}
          pageSizeOptions={pageSizeOptions}
          disabled={isBusy}
        />

        <div className="flex flex-row items-center justify-center gap-2 lg:flex-col lg:px-1">
          <Button
            size="sm"
            disabled={isBusy || selectedAvailable.size === 0}
            onClick={() => void addSelected()}
            title="Add selected to playing roster"
          >
            Add →
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={isBusy || selectedAdded.size === 0}
            onClick={() => void removeSelected()}
            title="Remove selected from playing roster"
          >
            ← Remove
          </Button>
        </div>

        <Column
          title={addedLabel}
          count={added.length}
          search={addedSearch}
          onSearch={setAddedSearch}
          items={addedView}
          selected={selectedAdded}
          onToggle={(id) => toggle(selectedAdded, id, setSelectedAdded)}
          onToggleAll={() =>
            toggleAll(addedPageItems, selectedAdded, setSelectedAdded)
          }
          onDoubleClick={(id) => void removeSelected([id])}
          emptyText="Nothing on the playing roster yet."
          tone="added"
          page={addedPage}
          pageSize={addedPageSize}
          onPageChange={setAddedPage}
          onPageSizeChange={setAddedPageSize}
          pageSizeOptions={pageSizeOptions}
          disabled={isBusy}
        />
      </div>
    </section>
  );
}
