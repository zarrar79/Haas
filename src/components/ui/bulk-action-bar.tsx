"use client";

import { Button } from "@/components/ui/button";

type BulkAction = {
  id: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  onClick: () => void;
};

type BulkActionBarProps = {
  selectedCount: number;
  busy?: boolean;
  onClear: () => void;
  actions: BulkAction[];
};

export function BulkActionBar({
  selectedCount,
  busy,
  onClear,
  actions,
}: BulkActionBarProps) {
  if (selectedCount <= 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2">
      <span className="text-sm text-[var(--text)]">
        <strong>{selectedCount}</strong> selected
      </span>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.id}
            size="sm"
            variant={action.variant ?? "secondary"}
            disabled={busy || action.disabled}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
        <Button size="sm" variant="ghost" disabled={busy} onClick={onClear}>
          Clear selection
        </Button>
      </div>
    </div>
  );
}

/** Run async work for each id; returns first error message if any failed. */
export async function runBulkSequential(
  ids: string[],
  worker: (id: string) => Promise<void>,
): Promise<{ ok: number; failed: number; error?: string }> {
  let ok = 0;
  let failed = 0;
  let error: string | undefined;
  for (const id of ids) {
    try {
      await worker(id);
      ok += 1;
    } catch (err) {
      failed += 1;
      if (!error) {
        error = err instanceof Error ? err.message : "Bulk action failed";
      }
    }
  }
  return { ok, failed, error };
}
