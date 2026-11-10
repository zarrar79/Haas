"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  SheetChipSelect,
  type ChipOption,
} from "@/components/ui/sheet-chip-select";
import { TextField } from "@/components/ui/text-field";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import {
  createPlatformChangeLog,
  deletePlatformChangeLog,
  downloadPlatformChangeLogSheet,
  getPlatformChangeLogGoogleSheet,
  getPlatformChangeLogOptions,
  listPlatformChangeLogs,
  syncPlatformChangeLogGoogle,
  updatePlatformChangeLog,
  type PlatformChangeLog,
  type PlatformChangeLogOptions,
} from "@/features/system/system-api";
import { redirectIfUnauthorized } from "@/lib/client-api";

/** Matches Google Sheet "Changed by" chips. */
const CHANGED_BY_CHIPS: ChipOption[] = [
  { value: "Akhlaq", className: "bg-green-800 text-white" },
  { value: "Zarrar", className: "bg-orange-300 text-stone-900" },
  { value: "Bilal", className: "bg-blue-600 text-white" },
  { value: "Mansoor", className: "bg-red-600 text-white" },
  { value: "Umer", className: "bg-violet-600 text-white" },
  { value: "Abdullah", className: "bg-yellow-900 text-white" },
  { value: "Kashif", className: "bg-purple-200 text-purple-950" },
];

/** Status chips (sheet dropdown + extras). */
const STATUS_CHIPS: ChipOption[] = [
  { value: "Not tested", className: "bg-amber-400 text-amber-950" },
  { value: "In testing", className: "bg-sky-500 text-white" },
  { value: "Ready for QA", className: "bg-indigo-500 text-white" },
  { value: "Verified", className: "bg-emerald-600 text-white" },
  { value: "Blocked", className: "bg-red-600 text-white" },
  { value: "Failed", className: "bg-rose-800 text-white" },
  { value: "Deferred", className: "bg-slate-500 text-white" },
];

const DEFAULT_STATUSES = STATUS_CHIPS.map((c) => c.value);
const DEFAULT_CHANGED_BY = CHANGED_BY_CHIPS.map((c) => c.value);

type SheetField =
  | "change_date"
  | "changed_by_name"
  | "title"
  | "affects"
  | "worst_case"
  | "what_to_test"
  | "status";

type SheetRow = {
  id: string;
  isNew?: boolean;
  change_date: string;
  changed_by_name: string;
  title: string;
  affects: string;
  worst_case: string;
  what_to_test: string;
  status: string;
};

const COLUMNS: {
  key: SheetField;
  header: string;
  width: string;
  type?: "date" | "text" | "textarea" | "chip";
  list?: keyof PlatformChangeLogOptions | "statuses";
  chips?: ChipOption[];
}[] = [
  { key: "change_date", header: "Date", width: "8rem", type: "date" },
  {
    key: "changed_by_name",
    header: "Changed by",
    width: "10rem",
    type: "chip",
    list: "changed_by",
    chips: CHANGED_BY_CHIPS,
  },
  { key: "title", header: "Change", width: "14rem", list: "changes" },
  {
    key: "affects",
    header: "What it can affect",
    width: "14rem",
    list: "affects",
  },
  {
    key: "worst_case",
    header: "Worst case",
    width: "16rem",
    type: "textarea",
  },
  {
    key: "what_to_test",
    header: "What to test",
    width: "16rem",
    type: "textarea",
  },
  {
    key: "status",
    header: "Status",
    width: "10rem",
    type: "chip",
    list: "statuses",
    chips: STATUS_CHIPS,
  },
];

function mergeChipOptions(
  base: ChipOption[],
  extras: string[],
): ChipOption[] {
  const out = [...base];
  const seen = new Set(base.map((c) => c.value.toLowerCase()));
  for (const raw of extras) {
    const value = (raw || "").trim();
    if (!value || seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    out.push({ value, className: "bg-slate-600 text-white" });
  }
  return out;
}

function toLocalDateInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromLocalDateInput(local: string): string | undefined {
  if (!local.trim()) return undefined;
  const d = new Date(`${local}T12:00:00`);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function todayLocal(): string {
  return toLocalDateInput(new Date().toISOString());
}

function rowClassForStatus(status: string): string {
  const key = (status || "").trim().toLowerCase();
  if (key === "blocked" || key === "critical" || key === "failed") {
    return "bg-red-500/10";
  }
  if (key === "in testing" || key === "testing" || key === "ready for qa") {
    return "bg-orange-500/10";
  }
  if (key === "not tested") {
    return "bg-amber-500/10";
  }
  if (key === "verified" || key === "done" || key === "complete") {
    return "bg-emerald-500/10";
  }
  if (key === "deferred") {
    return "bg-slate-500/10";
  }
  return "bg-[var(--surface)]";
}

function toSheetRow(row: PlatformChangeLog): SheetRow {
  return {
    id: row.id,
    change_date: toLocalDateInput(row.change_date),
    changed_by_name: row.changed_by_name || row.created_by_username || "",
    title: row.title || "",
    affects: row.affects || "",
    worst_case: row.worst_case || "",
    what_to_test: row.what_to_test || "",
    status: row.status || "Not tested",
  };
}

function blankRow(): SheetRow {
  return {
    id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    isNew: true,
    change_date: todayLocal(),
    changed_by_name: "",
    title: "",
    affects: "",
    worst_case: "",
    what_to_test: "",
    status: "Not tested",
  };
}

function snapshot(row: SheetRow): string {
  return JSON.stringify({
    change_date: row.change_date,
    changed_by_name: row.changed_by_name,
    title: row.title,
    affects: row.affects,
    worst_case: row.worst_case,
    what_to_test: row.what_to_test,
    status: row.status,
  });
}

const emptyOptions: PlatformChangeLogOptions = {
  statuses: DEFAULT_STATUSES,
  changed_by: DEFAULT_CHANGED_BY,
  changes: [],
  affects: [],
};

const CELL_CLASS =
  "box-border w-full min-w-0 border-0 bg-transparent px-2 py-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:bg-[var(--bg)] focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]";

export function SystemChangeLogView() {
  const router = useRouter();
  const { confirm } = usePlatformDialog();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [options, setOptions] = useState<PlatformChangeLogOptions>(emptyOptions);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [pushConfigured, setPushConfigured] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [focusedCell, setFocusedCell] = useState<string | null>(null);

  const savedSnapshots = useRef<Map<string, string>>(new Map());
  const commitTimers = useRef<Map<string, number>>(new Map());
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const filters = useMemo(
    () => ({
      status: statusFilter || undefined,
      search: search.trim() || undefined,
      date_from: fromLocalDateInput(dateFrom),
      date_to: fromLocalDateInput(dateTo),
    }),
    [statusFilter, search, dateFrom, dateTo],
  );

  const statusOptions = useMemo(() => {
    const merged = [...DEFAULT_STATUSES, ...(options.statuses || [])];
    const seen = new Set<string>();
    return merged.filter((s) => {
      const key = s.toLowerCase();
      if (!s.trim() || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [options.statuses]);

  const statusChipOptions = useMemo(
    () => mergeChipOptions(STATUS_CHIPS, options.statuses || []),
    [options.statuses],
  );

  const changedByChipOptions = useMemo(
    () => mergeChipOptions(CHANGED_BY_CHIPS, options.changed_by || []),
    [options.changed_by],
  );

  const listFor = useCallback(
    (list?: keyof PlatformChangeLogOptions | "statuses") => {
      if (!list) return [];
      if (list === "statuses") return statusOptions;
      if (list === "changed_by") {
        const merged = [...DEFAULT_CHANGED_BY, ...(options.changed_by || [])];
        const seen = new Set<string>();
        return merged.filter((s) => {
          const key = s.toLowerCase();
          if (!s.trim() || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
      return options[list] || [];
    },
    [options, statusOptions],
  );

  const loadMeta = useCallback(async () => {
    try {
      const [meta, opts] = await Promise.all([
        getPlatformChangeLogGoogleSheet(),
        getPlatformChangeLogOptions(),
      ]);
      setSheetUrl(meta.sheet_url || null);
      setPushConfigured(Boolean(meta.push_configured));
      setOptions({
        statuses: opts.statuses?.length ? opts.statuses : DEFAULT_STATUSES,
        changed_by: opts.changed_by?.length
          ? opts.changed_by
          : DEFAULT_CHANGED_BY,
        changes: opts.changes || [],
        affects: opts.affects || [],
      });
    } catch {
      /* meta is optional */
    }
  }, []);

  const applyLoadedRows = useCallback((loaded: PlatformChangeLog[]) => {
    const mapped = loaded.map(toSheetRow);
    const nextMap = new Map<string, string>();
    for (const row of mapped) nextMap.set(row.id, snapshot(row));
    savedSnapshots.current = nextMap;
    setRows([...mapped, blankRow()]);
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      applyLoadedRows(await listPlatformChangeLogs(filters));
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Failed to load change log");
    } finally {
      setIsLoading(false);
    }
  }, [applyLoadedRows, filters, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  function updateLocal(id: string, field: SheetField, value: string) {
    setRows((prev) => {
      const next = prev.map((row) =>
        row.id === id ? { ...row, [field]: value } : row,
      );
      // Keep ref in sync so immediate commits see the new value.
      rowsRef.current = next;
      return next;
    });
  }

  function applyFieldAndCommit(
    id: string,
    field: SheetField,
    value: string,
  ) {
    updateLocal(id, field, value);
    scheduleCommit(id, true);
  }

  function markSaving(id: string, on: boolean) {
    setSavingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function scheduleCommit(id: string, immediate = false) {
    const existing = commitTimers.current.get(id);
    if (existing) window.clearTimeout(existing);
    if (immediate) {
      commitTimers.current.delete(id);
      void flushCommit(id);
      return;
    }
    const timer = window.setTimeout(() => {
      commitTimers.current.delete(id);
      void flushCommit(id);
    }, 280);
    commitTimers.current.set(id, timer);
  }

  async function flushCommit(id: string) {
    const row = rowsRef.current.find((r) => r.id === id);
    if (!row) return;

    const current = snapshot(row);
    const previous = savedSnapshots.current.get(id);
    if (!row.isNew && previous === current) return;

    if (!row.title.trim()) {
      if (row.isNew) return;
      setError("Change is required.");
      return;
    }
    if (!row.status.trim()) {
      setError("Status is required.");
      return;
    }

    markSaving(id, true);
    setError(null);
    try {
      const body = {
        change_date: fromLocalDateInput(row.change_date),
        changed_by_name: row.changed_by_name.trim(),
        title: row.title.trim(),
        affects: row.affects.trim(),
        worst_case: row.worst_case.trim(),
        what_to_test: row.what_to_test.trim(),
        status: row.status.trim(),
      };

      if (row.isNew) {
        const created = await createPlatformChangeLog(body);
        const saved = toSheetRow(created);
        const latest = rowsRef.current.find((r) => r.id === id);
        const merged =
          latest && snapshot(latest) !== current
            ? {
                ...saved,
                change_date: latest.change_date,
                changed_by_name: latest.changed_by_name,
                title: latest.title,
                affects: latest.affects,
                worst_case: latest.worst_case,
                what_to_test: latest.what_to_test,
                status: latest.status,
              }
            : saved;
        savedSnapshots.current.set(saved.id, snapshot(saved));
        savedSnapshots.current.delete(id);
        setRows((prev) => {
          const next = prev.map((r) => (r.id === id ? merged : r));
          return next.some((r) => r.isNew) ? next : [...next, blankRow()];
        });
        setInfo("Row saved.");
        if (snapshot(merged) !== snapshot(saved)) {
          scheduleCommit(saved.id);
        }
        void loadMeta();
      } else {
        const updated = await updatePlatformChangeLog(id, body);
        const saved = toSheetRow(updated);
        // Only apply if user hasn't typed more since this request started.
        const latest = rowsRef.current.find((r) => r.id === id);
        if (latest && snapshot(latest) === current) {
          savedSnapshots.current.set(id, snapshot(saved));
          setRows((prev) => prev.map((r) => (r.id === id ? saved : r)));
          setInfo("Saved.");
        } else {
          // Newer edits pending — keep local values and reschedule.
          savedSnapshots.current.set(id, snapshot(saved));
          scheduleCommit(id);
        }
        void loadMeta();
      }
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Failed to save cell");
    } finally {
      markSaving(id, false);
    }
  }

  async function onDelete(row: SheetRow) {
    if (row.isNew) {
      setRows((prev) => {
        const next = prev.filter((r) => r.id !== row.id);
        return next.some((r) => r.isNew) ? next : [...next, blankRow()];
      });
      return;
    }
    const ok = await confirm({
      title: "Delete row",
      message: `Delete “${row.title || "this row"}”?`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deletePlatformChangeLog(row.id);
      savedSnapshots.current.delete(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setInfo("Row deleted.");
      void loadMeta();
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function onDownload() {
    setError(null);
    try {
      await downloadPlatformChangeLogSheet(filters);
      setInfo("Spreadsheet downloaded.");
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(
        err instanceof Error ? err.message : "Failed to download spreadsheet",
      );
    }
  }

  async function onSync(direction: "pull" | "push" | "both") {
    setIsSyncing(true);
    setError(null);
    setInfo(null);
    try {
      const result = await syncPlatformChangeLogGoogle({ direction });
      if (result.sheet_url) setSheetUrl(result.sheet_url);
      setPushConfigured(Boolean(result.push_configured));
      const bits = [
        result.created != null ? `created ${result.created}` : null,
        result.updated != null ? `updated ${result.updated}` : null,
        result.pushed ? `pushed ${result.rows ?? ""} rows` : null,
        result.push_skipped || null,
      ].filter(Boolean);
      setInfo(
        bits.length
          ? `Google Sheet sync done (${bits.join(", ")}).`
          : "Google Sheet sync done.",
      );
      await Promise.all([load(), loadMeta()]);
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Google Sheet sync failed");
    } finally {
      setIsSyncing(false);
    }
  }

  function onCellKeyDown(
    e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    rowId: string,
    field: SheetField,
  ) {
    if (e.key === "Enter" && !e.shiftKey) {
      const col = COLUMNS.find((c) => c.key === field);
      if (col?.type === "textarea") return;
      e.preventDefault();
      scheduleCommit(rowId, true);
      (e.target as HTMLElement).blur();
    }
    if (e.key === "Escape") {
      const existing = commitTimers.current.get(rowId);
      if (existing) window.clearTimeout(existing);
      commitTimers.current.delete(rowId);
      const prev = savedSnapshots.current.get(rowId);
      if (prev) {
        const restored = JSON.parse(prev) as Omit<SheetRow, "id" | "isNew">;
        setRows((rowsPrev) =>
          rowsPrev.map((r) =>
            r.id === rowId ? { ...r, ...restored, isNew: r.isNew } : r,
          ),
        );
      }
      (e.target as HTMLElement).blur();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text)]">
            Platform change log
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-[var(--text-muted)]">
            Excel-style sheet: click any cell to edit. Changes save when you leave
            the cell (Tab / click away / Enter). Status and name fields offer
            dropdown suggestions — type to create a new value.
          </p>
          {sheetUrl ? (
            <p className="mt-2 text-sm">
              <a
                href={sheetUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent)] underline-offset-2 hover:underline"
              >
                Open Google Sheet
              </a>
              {!pushConfigured ? (
                <span className="ml-2 text-[var(--text-muted)]">
                  (pull works now; push needs a service-account share)
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={isSyncing}
            onClick={() => void onSync("pull")}
          >
            {isSyncing ? "Syncing…" : "Pull from Sheet"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={isSyncing || !pushConfigured}
            onClick={() => void onSync(pushConfigured ? "both" : "pull")}
          >
            Sync both ways
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void onDownload()}>
            Download CSV
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setRows((prev) => {
                if (prev.some((r) => r.isNew && !r.title.trim())) return prev;
                return [...prev, blankRow()];
              });
            }}
          >
            Add row
          </Button>
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {info ? <Alert variant="success">{info}</Alert> : null}

      <div className="grid gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--text-muted)]">Status</span>
          <select
            className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <TextField
          label="Search"
          name="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Change, person, affect…"
        />
        <TextField
          label="From"
          name="date_from"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <TextField
          label="To"
          name="date_to"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text-muted)]">
          <span>
            {isLoading
              ? "Loading…"
              : `${rows.filter((r) => !r.isNew).length} rows · click a cell to edit`}
          </span>
          {savingIds.size > 0 ? (
            <span className="text-[var(--accent)]">Saving…</span>
          ) : null}
        </div>
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-full border-collapse text-left">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[var(--bg)] text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="border-b border-r border-[var(--border)] px-2 py-2 whitespace-nowrap"
                    style={{ minWidth: col.width, width: col.width }}
                  >
                    {col.header}
                  </th>
                ))}
                <th className="sticky right-0 border-b border-[var(--border)] bg-[var(--bg)] px-2 py-2 w-16">
                  {" "}
                </th>
              </tr>
            </thead>
            <tbody>
              {!isLoading && rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length + 1}
                    className="px-3 py-8 text-center text-sm text-[var(--text-muted)]"
                  >
                    No rows yet. Add a row or pull from the Google Sheet.
                  </td>
                </tr>
              ) : null}
              {rows.map((row) => {
                const saving = savingIds.has(row.id);
                return (
                  <tr
                    key={row.id}
                    className={`group border-b border-[var(--border)] ${rowClassForStatus(row.status)} ${
                      row.isNew ? "bg-[var(--accent)]/5" : ""
                    }`}
                  >
                    {COLUMNS.map((col) => {
                      const cellKey = `${row.id}:${col.key}`;
                      const listId = col.list
                        ? `change-log-sheet-${col.key}`
                        : undefined;
                      const focused = focusedCell === cellKey;
                      return (
                        <td
                          key={col.key}
                          className={`border-r border-[var(--border)] p-0 align-top ${
                            focused ? "bg-[var(--bg)]" : ""
                          }`}
                          style={{ minWidth: col.width, width: col.width }}
                        >
                          {col.type === "chip" ? (
                            <SheetChipSelect
                              value={row[col.key]}
                              options={
                                col.key === "status"
                                  ? statusChipOptions
                                  : changedByChipOptions
                              }
                              disabled={saving}
                              placeholder={
                                col.key === "status" ? "Status…" : "Person…"
                              }
                              onChange={(value) => {
                                setFocusedCell(cellKey);
                                updateLocal(row.id, col.key, value);
                              }}
                              onCommit={(selected) => {
                                setFocusedCell(null);
                                if (typeof selected === "string") {
                                  applyFieldAndCommit(
                                    row.id,
                                    col.key,
                                    selected,
                                  );
                                  return;
                                }
                                scheduleCommit(row.id, true);
                              }}
                            />
                          ) : col.type === "textarea" ? (
                            <textarea
                              className={`${CELL_CLASS} min-h-[2.5rem] resize-y`}
                              rows={2}
                              value={row[col.key]}
                              disabled={saving}
                              placeholder={
                                row.isNew && col.key === "worst_case"
                                  ? "Type here…"
                                  : undefined
                              }
                              onFocus={() => setFocusedCell(cellKey)}
                              onChange={(e) =>
                                updateLocal(row.id, col.key, e.target.value)
                              }
                              onBlur={() => {
                                setFocusedCell(null);
                                scheduleCommit(row.id);
                              }}
                              onKeyDown={(e) =>
                                onCellKeyDown(e, row.id, col.key)
                              }
                            />
                          ) : (
                            <input
                              className={CELL_CLASS}
                              type={col.type === "date" ? "date" : "text"}
                              list={listId}
                              value={row[col.key]}
                              disabled={saving}
                              placeholder={
                                row.isNew && col.key === "title"
                                  ? "New change…"
                                  : undefined
                              }
                              autoComplete="off"
                              onFocus={() => setFocusedCell(cellKey)}
                              onChange={(e) =>
                                updateLocal(row.id, col.key, e.target.value)
                              }
                              onBlur={() => {
                                setFocusedCell(null);
                                scheduleCommit(row.id);
                              }}
                              onKeyDown={(e) =>
                                onCellKeyDown(e, row.id, col.key)
                              }
                            />
                          )}
                        </td>
                      );
                    })}
                    <td className="sticky right-0 border-l border-[var(--border)] bg-inherit px-1 py-1 text-center align-middle">
                      <button
                        type="button"
                        className="rounded px-2 py-1 text-xs text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-600 disabled:opacity-40"
                        disabled={saving}
                        title={row.isNew ? "Clear draft row" : "Delete row"}
                        onClick={() => void onDelete(row)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
              {isLoading ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length + 1}
                    className="px-3 py-8 text-center text-sm text-[var(--text-muted)]"
                  >
                    Loading sheet…
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {COLUMNS.filter((c) => c.list).map((col) => (
          <datalist key={col.key} id={`change-log-sheet-${col.key}`}>
            {listFor(col.list).map((opt) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        ))}
      </div>
    </div>
  );
}
