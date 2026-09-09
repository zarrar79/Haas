"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { RemovableChip } from "@/components/ui/removable-chip";
import { TextField } from "@/components/ui/text-field";

type Identifiable = { id: string };

type SearchPickerProps<T extends Identifiable> = {
  title: string;
  headerActions?: ReactNode;
  searchLabel: string;
  searchName?: string;
  searchPlaceholder?: string;
  search: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  isSearching?: boolean;
  disabled?: boolean;
  emptyHint: string;
  emptyResults: string;
  selected: T[];
  results: T[];
  isSelected: (item: T) => boolean;
  onAdd: (item: T) => void;
  onRemove: (item: T) => void;
  getLabel: (item: T) => string;
  getSubtitle?: (item: T) => string | undefined;
  removeAriaLabel?: (item: T) => string;
  pickedLabel?: string;
  addLabel?: string;
  listMaxHeightClass?: string;
  children?: ReactNode;
};

export function SearchPicker<T extends Identifiable>({
  title,
  headerActions,
  searchLabel,
  searchName,
  searchPlaceholder,
  search,
  onSearchChange,
  onSearch,
  isSearching = false,
  disabled = false,
  emptyHint,
  emptyResults,
  selected,
  results,
  isSelected,
  onAdd,
  onRemove,
  getLabel,
  getSubtitle,
  removeAriaLabel,
  pickedLabel = "Added",
  addLabel = "Add",
  listMaxHeightClass = "max-h-48",
  children,
}: SearchPickerProps<T>) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-[var(--text)]">{title}</p>
        {headerActions ? (
          <div className="flex flex-wrap gap-2">{headerActions}</div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <TextField
          label={searchLabel}
          name={searchName}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          disabled={disabled}
        />
        <div className="flex items-end">
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || isSearching}
            onClick={onSearch}
          >
            {isSearching ? "Searching…" : "Search"}
          </Button>
        </div>
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((item) => (
            <RemovableChip
              key={item.id}
              label={getLabel(item)}
              disabled={disabled}
              onRemove={() => onRemove(item)}
              removeAriaLabel={removeAriaLabel?.(item)}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">{emptyHint}</p>
      )}

      <ul
        className={`${listMaxHeightClass} space-y-1 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] p-2`}
      >
        {results.length === 0 ? (
          <li className="px-2 py-3 text-center text-xs text-[var(--text-muted)]">
            {emptyResults}
          </li>
        ) : (
          results.map((item) => {
            const picked = isSelected(item);
            const subtitle = getSubtitle?.(item);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={disabled || picked}
                  className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2 py-2 text-left text-sm transition hover:bg-[var(--surface-hover)] ${
                    picked ? "opacity-50" : ""
                  }`}
                  onClick={() => onAdd(item)}
                >
                  <span>
                    <span className="font-medium text-[var(--text)]">
                      {getLabel(item)}
                    </span>
                    {subtitle ? (
                      <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                        {subtitle}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={
                      picked
                        ? "text-xs text-[var(--text-muted)]"
                        : "text-xs text-[var(--accent)]"
                    }
                  >
                    {picked ? pickedLabel : addLabel}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>

      {children}
    </div>
  );
}
